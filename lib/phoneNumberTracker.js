const { supabase } = require('./supabaseClient');

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
  
  // Check if it has a country code (starts with valid country code followed by 7-10 digits)
  const countryCodePattern = /^(\d{1,3})(\d{7,10})$/;
  const match = cleaned.match(countryCodePattern);
  
  if (match) {
    const countryCode = match[1];
    const localNumber = match[2];
    
    // Check if it's a valid country code
    if (validCountryCodes.includes(countryCode)) {
      // Has valid country code - keep as is
      
      // For Romanian numbers (country code 40), normalize the local part
      if (countryCode === '40') {
        // Remove leading zero from local number if present
        const normalizedLocal = localNumber.replace(/^0+/, '');
        return `${countryCode}${normalizedLocal}`;
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

    // Normalize phone number
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    // Use upsert to handle both insert and update cases atomically
    const { data, error } = await supabase
      .from('phone_numbers')
      .upsert(
        {
          phone_number: normalizedPhoneNumber,
          bookings_ids: [bookingId], // Start with this booking ID
          available_coupons: [], // Default empty array
          redeemed_coupons: [] // Default empty array
        },
        {
          onConflict: 'phone_number',
          ignoreDuplicates: false
        }
      )
      .select();

    if (error) {
      console.error('❌ Error in upsert operation:', error);
      throw error;
    }

    // If the row already existed, we need to append the booking ID to the existing array
    // Supabase upsert doesn't handle array concatenation automatically
    if (data && data.length > 0) {
      const existingRow = data[0];
      
      // Check if the booking ID is already in the array
      if (!existingRow.bookings_ids.includes(bookingId)) {
        // Append the new booking ID to the existing array
        const updatedBookingsIds = [...existingRow.bookings_ids, bookingId];
        
        const { data: updateData, error: updateError } = await supabase
          .from('phone_numbers')
          .update({ bookings_ids: updatedBookingsIds })
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
        return {
          success: true,
          data: existingRow,
          message: 'Booking already tracked for this phone number'
        };
      }
    }

    return {
      success: true,
      data: data[0],
      message: 'Phone number tracking created successfully'
    };

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
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    
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
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    
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
 */
async function redeemCoupon(phoneNumber, couponCode) {
  try {
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    
    // Get current data
    const currentData = await getPhoneNumberData(normalizedPhoneNumber);
    
    if (!currentData) {
      throw new Error('Phone number not found');
    }

    // Check if coupon is available
    if (!currentData.available_coupons.includes(couponCode)) {
      throw new Error('Coupon not available for this phone number');
    }

    // Check if coupon is already redeemed
    if (currentData.redeemed_coupons.includes(couponCode)) {
      return {
        success: false,
        message: 'Coupon already redeemed'
      };
    }

    // Remove from available and add to redeemed
    const updatedAvailableCoupons = currentData.available_coupons.filter(c => c !== couponCode);
    const updatedRedeemedCoupons = [...currentData.redeemed_coupons, couponCode];
    
    const { data, error } = await supabase
      .from('phone_numbers')
      .update({ 
        available_coupons: updatedAvailableCoupons,
        redeemed_coupons: updatedRedeemedCoupons
      })
      .eq('phone_number', normalizedPhoneNumber)
      .select();

    if (error) {
      throw error;
    }

    return {
      success: true,
      data: data[0],
      message: 'Coupon redeemed successfully'
    };
  } catch (error) {
    console.error('❌ Error redeeming coupon:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to redeem coupon'
    };
  }
}

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

    // Normalize phone number
    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

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

module.exports = {
  trackPhoneNumberForBooking,
  trackPhoneNumberForSpinningWheel,
  getPhoneNumberData,
  addAvailableCoupon,
  redeemCoupon
}; 