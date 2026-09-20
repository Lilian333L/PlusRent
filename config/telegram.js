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
🚗 <b>Mașină nouă adăugată</b>

<b>Detalii Mașină:</b>
• Marca: ${carData.make_name}
• Model: ${carData.model_name}
• Anul: ${carData.production_year}
• Tipul: ${carData.car_type}
• Combustibil: ${carData.fuel_type}
• Cutia de viteză: ${carData.gear_type}
• Uși: ${carData.num_doors}
• Pasageri: ${carData.num_passengers}

<b>Pricing:</b>
• 1-2 days: €${carData.price_policy['1-2']}
• 3-7 days: €${carData.price_policy['3-7']}
• 8-20 days: €${carData.price_policy['8-20']}
• 21-45 days: €${carData.price_policy['21-45']}
• 46+ days: €${carData.price_policy['46+']}

<b>Asigurare:</b>
• RCA: €${carData.rca_insurance_price}/day
• Casco: €${carData.casco_insurance_price}/day

⏰ Adăugat la: ${new Date().toLocaleString()}
    `;
  }

  formatCarUpdatedMessage(carData) {
    return `
✏️ <b>Mașină actualizată</b>

<b>Detalii Mașină:</b>
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

<b>Asigurare:</b>
• RCA: €${carData.rca_insurance_price}/day
• Casco: €${carData.casco_insurance_price}/day

⏰ Actualizat la: ${new Date().toLocaleString()}
    `;
  }

  formatCarDeletedMessage(carData) {
    return `
🗑️ <b>Mașină Ștearsa</b>

<b>Detalii Mașină:</b>
• Marca: ${carData.make_name}
• Model: ${carData.model_name}
• Anul: ${carData.production_year}
• Tipul: ${carData.car_type}

⏰ Ștearsă la: ${new Date().toLocaleString()}
    `;
  }

  /**
   * A number you cannot dial is worth saying out loud.
   *
   * Bookings arrived for a while with the country code missing, because the
   * form sent what the customer typed rather than the international form the
   * phone widget had worked out. That is fixed at the source, but if it ever
   * happens again, through an older cached script or a form nobody wired up,
   * the message should say so while the booking is still fresh rather than
   * leave it to be discovered when somebody tries to call.
   */
  formatPhone(phone) {
    if (!phone) return 'Nu este informație adăugată.';
    const value = String(phone).trim();
    return value.startsWith('+')
      ? value
      : `${value}  ⚠️ fără prefix de țară, cere-l clientului`;
  }

  formatBookingMessage(bookingData) {
    return `
  📆 <b>Cerere De Rezervare</b>

  <b>Detalii client:</b>
  • Nume: ${bookingData.contact_person || 'Nu este informație adăugată.'}
  • Telefon: ${this.formatPhone(bookingData.contact_phone)}
  • Email: ${bookingData.email || 'Nu este informație adăugată.'}
  • Vârsta: ${bookingData.age || 'Nu este informație adăugată.'}
  
  <b>Detalii despre mașină:</b>
  • Mașina: ${bookingData.make_name} ${bookingData.model_name} (${bookingData.production_year})
  
  <b>Detalii rezervare:</b>
  • Ridicare: ${this.formatDate(bookingData.pickup_date)} at ${bookingData.pickup_time}
  • Returnare: ${this.formatDate(bookingData.return_date)} at ${bookingData.return_time}
  • Locul de preluare: ${bookingData.pickup_location}
  • Locație de predare: ${bookingData.dropoff_location}
  
  • Preț total: €${bookingData.total_price}
  ${bookingData.discount_code ? `• Codul Cuponului: <code>${bookingData.discount_code}</code>` : ''}
  ${bookingData.coupon_details ? this.formatCouponDetails(bookingData.coupon_details) : ''}
  
  <b>Instrucțiuni speciale:</b>
  ${bookingData.special_instructions || 'Nu este informație adăugată.'}
  
  ⏰ Rezervat la: ${new Date().toLocaleString()}
      `;
  }
  
  // Add this new method to format coupon details:
  formatCouponDetails(couponDetails) {
    if (!couponDetails) return '';
    
    let details = '\n<b>Coupon Details:</b>';
    
    if (couponDetails.type === 'percentage' && couponDetails.discount_percentage) {
      details += `\n• Discount: ${couponDetails.discount_percentage}%`;
    }
    
    if (couponDetails.type === 'free_days' && couponDetails.free_days) {
      details += `\n• Free Days: ${couponDetails.free_days} day${couponDetails.free_days > 1 ? 's' : ''}`;
    }
    
    return details;
  }

  formatCouponAddedMessage(couponData) {
    return `
🎫 <b>Cupon Nou Adăugat</b>

<b>Detalii Cupon:</b>
• Codul: <code>${couponData.code}</code>
• Reducerea: ${couponData.discount_percentage}%
• Descriere: ${couponData.description || 'No description'}
• Status: ${couponData.is_active ? 'Active' : 'Inactive'}
${couponData.expires_at ? `• Expires: ${new Date(couponData.expires_at).toLocaleString()}` : ''}

⏰ Adăugat la: ${new Date().toLocaleString()}
    `;
  }

  formatCouponUpdatedMessage(couponData) {
    return `
✏️ <b>Cupon Actualizat</b>

<b>Detalii Cupon:</b>
• Codul: <code>${couponData.code}</code>
• Reducerea: ${couponData.discount_percentage}%
• Descriere: ${couponData.description || 'No description'}
• Status: ${couponData.is_active ? 'Active' : 'Inactive'}
${couponData.expires_at ? `• Expires: ${new Date(couponData.expires_at).toLocaleString()}` : ''}

⏰ Actualizat la: ${new Date().toLocaleString()}
    `;
  }

  formatCouponDeletedMessage(couponData) {
    return `
🗑️ <b>Cupon șters</b>

<b>Coupon Details:</b>
• Code: <code>${couponData.code}</code>
• Discount: ${couponData.discount_percentage}%

⏰ Deleted at: ${new Date().toLocaleString()}
    `;
  }

  formatSoberDriverCallbackMessage(callbackData) {
    return `
🚗 <b>Cerere de Șofer Treaz</b>

<b>Detalii client:</b>
• Număr de contact: ${callbackData.phone_number}
• Numele: ${callbackData.customer_name || 'Nu este informație adăugată.'}
• Email: ${callbackData.customer_email || 'Nu este informație adăugată.'}

<b>Instrucțiuni:</b>
${callbackData.special_instructions || 'Nu este informație adăugată.'}

⏰ Cerere la ora: ${new Date().toLocaleString()}

📞 <b>Vă rugăm să sunați înapoi în câteva minute!</b>
    `;
  }
}

module.exports = TelegramNotifier; 
