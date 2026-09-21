const { supabase } = require('./supabaseClient');
const { normalize: toInternational, COUNTRIES } = require('./phone-countries');

/**
 * Normalize phone number to ensure consistent format
 * 
 * @param {string} phoneNumber - The phone number to normalize
 * @returns {string} - Normalized phone number
 */
function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  
  // Remove spaces, dashes, parentheses, and plus sign
  let cleaned = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
  
  // Check if it has a valid country code
  // Valid country codes: 1, 7, 20-99, 100-999
  const validCountryCodes = [
    '1', '7', // Single digit country codes
    '20', '21', '22', '23', '24', '25', '26', '27', '28', '29',
    '30', '31', '32', '33', '34', '35', '36', '37', '38', '39',
    '40', '41', '42', '43', '44', '45', '46', '47', '48', '49',
    '50', '51', '52', '53', '54', '55', '56', '57', '58', '59',
    '60', '61', '62', '63', '64', '65', '66', '67', '68', '69',
    '70', '71', '72', '73', '74', '75', '76', '77', '78', '79',
    '80', '81', '82', '83', '84', '85', '86', '87', '88', '89',
    '90', '91', '92', '93', '94', '95', '96', '97', '98', '99'
  ];
  
  // Special handling for Romanian numbers that start with 7 (local numbers)
  // Romanian mobile numbers start with 7, but we want to treat them as local numbers
  if (cleaned.startsWith('7') && cleaned.length === 9) {
    // This is a Romanian mobile number (7XXXXXXXX)
    return cleaned;
  }
  
  // Special handling for Romanian numbers with country code 40
  if (cleaned.startsWith('40') && cleaned.length === 10) {
    // This is a Romanian number with country code 40
    const localNumber = cleaned.substring(2); // Remove '40' prefix
    return localNumber;
  }
  
  // Check if it has a country code (starts with valid country code followed by 6-10 digits)
  const countryCodePattern = /^(\d{1,3})(\d{6,10})$/;
  const match = cleaned.match(countryCodePattern);
  
  if (match) {
    const countryCode = match[1];
    const localNumber = match[2];
    
    // Check if it's a valid country code
    if (validCountryCodes.includes(countryCode)) {
      // Has valid country code - keep as is
      
      // For Romanian numbers (country code 40), return just the local part
      if (countryCode === '40') {
        // Remove leading zero from local number if present
        const normalizedLocal = localNumber.replace(/^0+/, '');
        return normalizedLocal;
      }
      
      // For other country codes, keep as is
      return cleaned;
    }
  }
  
  // No country code - treat as local number
  // Remove leading zero if present
  return cleaned.replace(/^0+/, '');
}

/**
 * Every key the same person's row could be stored under.
 *
 * The site has written two shapes into phone_numbers over time: the number
 * with its country code, from the booking forms, and the bare local number,
 * from the discount wheel, which used to send whatever was typed. Both are
 * the same customer, and a coupon won on the wheel has to still be there when
 * they book.
 *
 * So rather than rewrite what is already stored, which would strand the rows
 * nobody has redeemed yet, every lookup tries the shapes in turn. New rows are
 * written under the first one, the number with its country code.
 */
function keyCandidates(phoneNumber) {
  const keys = [];
  const push = (key) => { if (key && keys.indexOf(key) === -1) keys.push(key); };

  const international = toInternational(phoneNumber);
  if (international && international.startsWith('+')) {
    push(normalizePhoneNumber(international));

    // the same number without its country code, the shape the wheel wrote
    const bare = international.slice(1);
    let dial = '';
    for (const country of COUNTRIES) {
      if (bare.indexOf(country.dial) === 0 && country.dial.length > dial.length) {
        dial = country.dial;
      }
    }
    if (dial) push(normalizePhoneNumber(bare.slice(dial.length)));
  }

  push(normalizePhoneNumber(phoneNumber));
  return keys;
}

/**
 * The key this person's row actually lives under, or the one a new row should
 * take. Costs one extra read at most, and only when the first shape misses.
 */
async function resolvePhoneKey(phoneNumber) {
  const keys = keyCandidates(phoneNumber);
  for (const key of keys) {
    const { data } = await supabase
      .from('phone_numbers')
      .select('phone_number')
      .eq('phone_number', key)
      .maybeSingle();
    if (data) return key;
  }
  return keys[0] || normalizePhoneNumber(phoneNumber);
}

/**
 * Track phone number when a booking is accepted
 * This function handles the phone_numbers table operations atomically
 * 
 * @param {string} phoneNumber - The phone number from the booking
 * @param {string} bookingId - The booking ID to add to the phone number's bookings
 * @returns {Promise<Object>} - Result object with success status and data
 */
async function trackPhoneNumberForBooking(phoneNumber, bookingId) {
  try {
    // Validate inputs
    if (!phoneNumber || !bookingId) {
      throw new Error('Phone number and booking ID are required');
    }

    // The key the row lives under, whichever shape it was first written in
    const normalizedPhoneNumber = await resolvePhoneKey(phoneNumber);

    // First, try to get existing phone number data
    const { data: existingData, error: fetchError } = await supabase
      .from('phone_numbers')
      .select('bookings_ids, available_coupons, redeemed_coupons')
      .eq('phone_number', normalizedPhoneNumber)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new phone numbers
      console.error('❌ Error fetching existing phone number:', fetchError);
      throw fetchError;
    }

    if (existingData) {
      // Phone number exists - append booking ID to existing array
      const existingBookingsIds = existingData.bookings_ids || [];
      
      // Check if booking ID is already in the array
      if (existingBookingsIds.includes(bookingId)) {
        return {
          success: true,
          data: existingData,
          message: 'Booking already tracked for this phone number'
        };
      }

      // Append the new booking ID
      const updatedBookingsIds = [...existingBookingsIds, bookingId];
      
      const { data: updateData, error: updateError } = await supabase
        .from('phone_numbers')
        .update({ 
          bookings_ids: updatedBookingsIds,
          // Preserve existing coupon data
          available_coupons: existingData.available_coupons,
          redeemed_coupons: existingData.redeemed_coupons
        })
        .eq('phone_number', normalizedPhoneNumber)
        .select();

      if (updateError) {
        console.error('❌ Error updating bookings_ids array:', updateError);
        throw updateError;
      }

      return {
        success: true,
        data: updateData[0],
        message: 'Phone number tracking updated successfully'
      };
    } else {
      // Phone number doesn't exist - create new record
      const { data: insertData, error: insertError } = await supabase
        .from('phone_numbers')
        .insert({
          phone_number: normalizedPhoneNumber,
          bookings_ids: [bookingId],
          available_coupons: [],
          redeemed_coupons: []
        })
        .select();

      if (insertError) {
        console.error('❌ Error inserting new phone number:', insertError);
        throw insertError;
      }

      return {
        success: true,
        data: insertData[0],
        message: 'Phone number tracking created successfully'
      };
    }

  } catch (error) {
    console.error('❌ Error tracking phone number:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to track phone number'
    };
  }
}

/**
 * Get phone number tracking data
 * 
 * @param {string} phoneNumber - The phone number to look up
 * @returns {Promise<Object>} - Phone number data or null if not found
 */
async function getPhoneNumberData(phoneNumber) {
  try {
    const normalizedPhoneNumber = await resolvePhoneKey(phoneNumber);
    
    const { data, error } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('phone_number', normalizedPhoneNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Error getting phone number data:', error);
    throw error;
  }
}

/**
 * Add available coupon to phone number
 * 
 * @param {string} phoneNumber - The phone number
 * @param {string} couponCode - The coupon code to add
 * @returns {Promise<Object>} - Result object
 */
async function addAvailableCoupon(phoneNumber, couponCode) {
  try {
    const normalizedPhoneNumber = await resolvePhoneKey(phoneNumber);
    
    // Get current data
    const currentData = await getPhoneNumberData(normalizedPhoneNumber);
    
    if (!currentData) {
      throw new Error('Phone number not found');
    }

    // Check if coupon is already available
    if (currentData.available_coupons.includes(couponCode)) {
      return {
        success: true,
        message: 'Coupon already available for this phone number'
      };
    }

    // Add coupon to available_coupons array
    const updatedAvailableCoupons = [...currentData.available_coupons, couponCode];
    
    const { data, error } = await supabase
      .from('phone_numbers')
      .update({ available_coupons: updatedAvailableCoupons })
      .eq('phone_number', normalizedPhoneNumber)
      .select();

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: data[0],
      message: 'Coupon added to available coupons successfully'
    };
  } catch (error) {
    console.error('❌ Error adding available coupon:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to add available coupon'
    };
  }
}

/**
 * Redeem a coupon for a phone number
 * 
 * @param {string} phoneNumber - The phone number
 * @param {string} couponCode - The coupon code to redeem
 * @returns {Promise<Object>} - Result object
 

/**
 * Track phone number when user enters spinning wheel
 * This function creates a new phone number entry if it doesn't exist
 * 
 * @param {string} phoneNumber - The phone number from the user
 * @returns {Promise<Object>} - Result object with success status and data
 */
async function trackPhoneNumberForSpinningWheel(phoneNumber) {
  try {

    // Validate input
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // The key the row lives under, whichever shape it was first written in
    const normalizedPhoneNumber = await resolvePhoneKey(phoneNumber);

    // Check if phone number already exists
    const existingData = await getPhoneNumberData(normalizedPhoneNumber);
    
    if (existingData) {
      return {
        success: true,
        data: existingData,
        message: 'Phone number already tracked',
        isNew: false
      };
    }

    // Create new phone number entry
    const { data, error } = await supabase
      .from('phone_numbers')
      .insert({
        phone_number: normalizedPhoneNumber,
        bookings_ids: [], // Empty array for new entries
        available_coupons: [], // Empty array for new entries
        redeemed_coupons: [] // Empty array for new entries
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating phone number entry:', error);
      throw error;
    }


    return {
      success: true,
      data: data,
      message: 'Phone number tracking created successfully',
      isNew: true
    };

  } catch (error) {
    console.error('❌ Error tracking phone number for spinning wheel:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to track phone number for spinning wheel'
    };
  }
}
/**
 * Add a coupon to the redeemed_coupons array for a phone number
 * This is called when a user actually uses a coupon code
 */
async function addRedeemedCoupon(phoneNumber, couponCode) {
  try {
    const normalizedPhone = await resolvePhoneKey(phoneNumber);
    
    // Get current phone number data
    const { data: phoneData, error: fetchError } = await supabase
      .from('phone_numbers')
      .select('available_coupons, redeemed_coupons')
      .eq('phone_number', normalizedPhone)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    let redeemedCoupons = phoneData?.redeemed_coupons || [];
    let availableCoupons = phoneData?.available_coupons || [];
    
    // Add the coupon to redeemed_coupons if not already there
    if (!redeemedCoupons.includes(couponCode)) {
      redeemedCoupons.push(couponCode);
    }
    if(availableCoupons.includes(couponCode)){
      availableCoupons = availableCoupons.filter(coupon => coupon !== couponCode);
    }
      // Update the phone number record
      const { error: updateError } = await supabase
      .from('phone_numbers')
      .update({ 
        redeemed_coupons: redeemedCoupons,
        available_coupons: availableCoupons
      })
      .eq('phone_number', normalizedPhone);   
      
      
      if (updateError) {
        throw updateError;
      }


    return {
      success: true,
      message: 'Coupon added to redeemed list',
      redeemedCoupons: redeemedCoupons
    };

  } catch (error) {
    console.error('❌ Error adding redeemed coupon:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to add redeemed coupon'
    };
  }
}

module.exports = {
  normalizePhoneNumber,
  keyCandidates,
  resolvePhoneKey,
  trackPhoneNumberForBooking,
  trackPhoneNumberForSpinningWheel,
  getPhoneNumberData,
  addAvailableCoupon,
  addRedeemedCoupon,
}; 