const axios = require('axios');

class TelegramNotifier {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  // Helper function to format dates in a user-friendly way
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return dateString; // Return original if parsing fails
    }
  }

  async sendMessage(message) {
    if (!this.botToken || !this.chatId) {
      return;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending Telegram notification:', error.message);
      return null;
    }
  }

  formatCarAddedMessage(carData) {
    return `
🚗 <b>New Car Added</b>

<b>Car Details:</b>
• Make: ${carData.make_name}
• Model: ${carData.model_name}
• Year: ${carData.production_year}
• Type: ${carData.car_type}
• Fuel: ${carData.fuel_type}
• Gear: ${carData.gear_type}
• Doors: ${carData.num_doors}
• Passengers: ${carData.num_passengers}

<b>Pricing:</b>
• 1-2 days: €${carData.price_policy['1-2']}
• 3-7 days: €${carData.price_policy['3-7']}
• 8-20 days: €${carData.price_policy['8-20']}
• 21-45 days: €${carData.price_policy['21-45']}
• 46+ days: €${carData.price_policy['46+']}

<b>Insurance:</b>
• RCA: €${carData.rca_insurance_price}/day
• Casco: €${carData.casco_insurance_price}/day

⏰ Added at: ${new Date().toLocaleString()}
    `;
  }

  formatCarUpdatedMessage(carData) {
    return `
✏️ <b>Car Updated</b>

<b>Car Details:</b>
• Make: ${carData.make_name}
• Model: ${carData.model_name}
• Year: ${carData.production_year}
• Type: ${carData.car_type}
• Fuel: ${carData.fuel_type}
• Gear: ${carData.gear_type}
• Doors: ${carData.num_doors}
• Passengers: ${carData.num_passengers}

<b>Pricing:</b>
• 1-2 days: €${carData.price_policy['1-2']}
• 3-7 days: €${carData.price_policy['3-7']}
• 8-20 days: €${carData.price_policy['8-20']}
• 21-45 days: €${carData.price_policy['21-45']}
• 46+ days: €${carData.price_policy['46+']}

<b>Insurance:</b>
• RCA: €${carData.rca_insurance_price}/day
• Casco: €${carData.casco_insurance_price}/day

⏰ Updated at: ${new Date().toLocaleString()}
    `;
  }

  formatCarDeletedMessage(carData) {
    return `
🗑️ <b>Car Deleted</b>

<b>Car Details:</b>
• Make: ${carData.make_name}
• Model: ${carData.model_name}
• Year: ${carData.production_year}
• Type: ${carData.car_type}

⏰ Deleted at: ${new Date().toLocaleString()}
    `;
  }

  formatBookingMessage(bookingData) {
    return `
📋 <b>New Booking Request</b>

<b>Customer Details:</b>
• Name: ${bookingData.contact_person || 'Not provided'}
• Phone: ${bookingData.contact_phone || 'Not provided'}
• Email: ${bookingData.email || 'Not provided'}
• Age: ${bookingData.age || 'Not provided'}

<b>Car Details:</b>
• Car: ${bookingData.make_name} ${bookingData.model_name} (${bookingData.production_year})

<b>Booking Details:</b>
• Pickup: ${this.formatDate(bookingData.pickup_date)} at ${bookingData.pickup_time}
• Return: ${this.formatDate(bookingData.return_date)} at ${bookingData.return_time}
• Pickup Location: ${bookingData.pickup_location}
• Dropoff Location: ${bookingData.dropoff_location}

• Total Price: €${bookingData.total_price}
${bookingData.discount_code ? `• Coupon Code: <code>${bookingData.discount_code}</code>` : ''}

<b>Special Instructions:</b>
${bookingData.special_instructions || 'None provided'}

⏰ Booked at: ${new Date().toLocaleString()}
    `;
  }

  formatCouponAddedMessage(couponData) {
    return `
🎫 <b>New Coupon Added</b>

<b>Coupon Details:</b>
• Code: <code>${couponData.code}</code>
• Discount: ${couponData.discount_percentage}%
• Description: ${couponData.description || 'No description'}
• Status: ${couponData.is_active ? 'Active' : 'Inactive'}
${couponData.expires_at ? `• Expires: ${new Date(couponData.expires_at).toLocaleString()}` : ''}

⏰ Added at: ${new Date().toLocaleString()}
    `;
  }

  formatCouponUpdatedMessage(couponData) {
    return `
✏️ <b>Coupon Updated</b>

<b>Coupon Details:</b>
• Code: <code>${couponData.code}</code>
• Discount: ${couponData.discount_percentage}%
• Description: ${couponData.description || 'No description'}
• Status: ${couponData.is_active ? 'Active' : 'Inactive'}
${couponData.expires_at ? `• Expires: ${new Date(couponData.expires_at).toLocaleString()}` : ''}

⏰ Updated at: ${new Date().toLocaleString()}
    `;
  }

  formatCouponDeletedMessage(couponData) {
    return `
🗑️ <b>Coupon Deleted</b>

<b>Coupon Details:</b>
• Code: <code>${couponData.code}</code>
• Discount: ${couponData.discount_percentage}%

⏰ Deleted at: ${new Date().toLocaleString()}
    `;
  }

  formatSoberDriverCallbackMessage(callbackData) {
    return `
🚗 <b>New Sober Driver Callback Request</b>

<b>Customer Details:</b>
• Phone: ${callbackData.phone_number}
• Name: ${callbackData.customer_name || 'Not provided'}
• Email: ${callbackData.customer_email || 'Not provided'}

<b>Special Instructions:</b>
${callbackData.special_instructions || 'None provided'}

⏰ Requested at: ${new Date().toLocaleString()}

📞 <b>Please call back within minutes!</b>
    `;
  }
}

module.exports = TelegramNotifier; 