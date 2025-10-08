/**
 * DatePickerManager - Reusable Flatpickr date picker with unavailable dates
 * Usage: new DatePickerManager(options)
 */

class DatePickerManager {
  constructor(options = {}) {
    this.pickupInputId = options.pickupInputId || "date-picker";
    this.returnInputId = options.returnInputId || "date-picker-2";
    this.carId = options.carId || null;
    this.onDateChange = options.onDateChange || null;
    this.dateFormat = options.dateFormat || "d-m-Y";
    this.pickupFlatpickr = null;
    this.returnFlatpickr = null;
    this.isModal = options.isModal || false;
    this.customClass = options.customClass || "";
  }

  // Helper function to convert dd-mm-yyyy to YYYY-MM-DD
  convertDateFormatToISO(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert dd-mm-yyyy to YYYY-MM-DD
    }
    return dateStr;
  }

  // Function to find the first available date after a given date
  findFirstAvailableDate(startDate, unavailableDates) {
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    let attempts = 0;
    const maxAttempts = 30; // Prevent infinite loop

    while (attempts < maxAttempts) {
      const dateStr = currentDate.toISOString().split("T")[0];
      if (!unavailableDates.includes(dateStr)) {
        // Convert YYYY-MM-DD to dd-mm-yyyy format
        const parts = dateStr.split("-");
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      currentDate.setDate(currentDate.getDate() + 1);
      attempts++;
    }

    // Fallback: return the start date if no available date found
    const fallbackDate = startDate.toISOString().split("T")[0];
    const parts = fallbackDate.split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  // Load unavailable dates from API
  async loadUnavailableDates(carId) {
    try {
      const response = await fetch(
        `${window.API_BASE_URL}/api/cars/${carId}/booking-dates`
      );
      if (response.ok) {
        const data = await response.json();
        const unavailableDates = [];

        if (data.booking_dates && Array.isArray(data.booking_dates)) {
          data.booking_dates.forEach((booking) => {
            if (booking.pickup_date && booking.return_date) {
              // Add date range to unavailable dates
              const startDate = new Date(booking.pickup_date);
              const endDate = new Date(booking.return_date);

              for (
                let d = new Date(startDate);
                d <= endDate;
                d.setDate(d.getDate() + 1)
              ) {
                const dateStr = d.toISOString().split("T")[0];
                unavailableDates.push(dateStr);
              }
            }
          });
        }

        return unavailableDates;
      }
    } catch (error) {
      console.warn("Failed to load unavailable dates:", error);
    }

    return [];
  }

  // Initialize Flatpickr with unavailable dates
  async initializeFlatpickrWithUnavailableDates(unavailableDates = []) {
    // Prevent multiple initializations
    if (this.pickupFlatpickr || this.returnFlatpickr) {
      // Apply unavailable dates to existing instances
      if (unavailableDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter only future unavailable dates
        const futureUnavailableDates = unavailableDates.filter((date) => {
          const unavailableDate = new Date(date);
          unavailableDate.setHours(0, 0, 0, 0);
          return unavailableDate >= today;
        });

        // Convert to dd-mm-yyyy format
        const convertedUnavailableDates = futureUnavailableDates.map((date) => {
          const parts = date.split("-");
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        });

        // Apply to existing instances using disable function
        const disableFunction = [
          function(date) {
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);
            const dateStr = checkDate.toISOString().split('T')[0];
            const parts = dateStr.split('-');
            const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            return convertedUnavailableDates.includes(formattedDate);
          }
        ];

        if (this.pickupFlatpickr) {
          this.pickupFlatpickr.set("disable", disableFunction);
          this.pickupFlatpickr.redraw();
        }
        if (this.returnFlatpickr) {
          this.returnFlatpickr.set("disable", disableFunction);
          this.returnFlatpickr.redraw();
        }
      }

      // Trigger callback if dates are set
      setTimeout(() => {
        if (this.onDateChange && typeof this.onDateChange === "function") {
          this.onDateChange();
        }
      }, 100);
      return;
    }

    const pickupInput = document.getElementById(this.pickupInputId);
    const returnInput = document.getElementById(this.returnInputId);
    
    if (pickupInput && returnInput) {
      // Remove any existing daterangepicker instances
      if ($(pickupInput).data("daterangepicker")) {
        $(pickupInput).data("daterangepicker").remove();
      }
      if ($(returnInput).data("daterangepicker")) {
        $(returnInput).data("daterangepicker").remove();
      }

      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Filter unavailable dates to only include future dates
      const futureUnavailableDates = unavailableDates.filter((date) => {
        const unavailableDate = new Date(date);
        unavailableDate.setHours(0, 0, 0, 0);
        return unavailableDate >= today;
      });

      // Convert unavailable dates from YYYY-MM-DD to d-m-Y format
      const convertedUnavailableDates = futureUnavailableDates.map((date) => {
        const parts = date.split("-");
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      });

      // Find first available dates
      const firstAvailablePickupDate = this.findFirstAvailableDate(
        today,
        futureUnavailableDates
      );
      const firstAvailableReturnDate = this.findFirstAvailableDate(
        tomorrow,
        futureUnavailableDates
      );

      // Set initial values
      pickupInput.value = firstAvailablePickupDate;
      returnInput.value = firstAvailableReturnDate;
      pickupInput.setAttribute("value", firstAvailablePickupDate);
      returnInput.setAttribute("value", firstAvailableReturnDate);

      // Disable function for occupied dates with styling
      const disableOccupiedDates = function(date) {
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const dateStr = checkDate.toISOString().split('T')[0];
        const parts = dateStr.split('-');
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        return convertedUnavailableDates.includes(formattedDate);
      };

      // ✅ КРИТИЧЕСКАЯ ФУНКЦИЯ: Добавляет класс .occupied к занятым датам
      const addOccupiedClass = (dObj, dStr, fp, dayElem) => {
        const date = dayElem.dateObj;
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const dateStr = checkDate.toISOString().split('T')[0];
        const parts = dateStr.split('-');
        const formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        
        if (convertedUnavailableDates.includes(formattedDate)) {
          dayElem.classList.add('occupied');
        }
      };

      // Initialize pickup date picker
      this.pickupFlatpickr = flatpickr(pickupInput, {
        dateFormat: this.dateFormat,
        altFormat: this.dateFormat,
        altInput: false,
        minDate: "today", // ✅ БЛОКИРОВКА ПРОШЛОГО
        defaultDate: firstAvailablePickupDate,
        disable: [disableOccupiedDates], // ✅ Функция вместо массива
        allowInput: false,
        static: this.isModal ? true : false,
        appendTo: document.body,
        position: this.isModal ? "above" : "below",
        closeOnSelect: true,
        disableMobile: true,
        locale: {
          months: {
            shorthand: [
              "Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ],
            longhand: [
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"
            ],
          },
          weekdays: {
            shorthand: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            longhand: [
              "Sunday", "Monday", "Tuesday", "Wednesday",
              "Thursday", "Friday", "Saturday"
            ],
          },
        },
        onDayCreate: addOccupiedClass, // ✅ Добавляем класс к занятым датам
        onChange: (selectedDates, dateStr, instance) => {
          if (selectedDates.length > 0) {
            const selectedDate = selectedDates[0];
            const todayCheck = new Date();
            todayCheck.setHours(0, 0, 0, 0);

            // Prevent selecting past dates
            const selectedDateOnly = new Date(
              selectedDate.getFullYear(),
              selectedDate.getMonth(),
              selectedDate.getDate()
            );

            if (selectedDateOnly < todayCheck) {
              instance.setDate(firstAvailablePickupDate);
              alert("Please select today or a future date");
              return;
            }

            // Update return date to same day initially
            const sameDay = new Date(selectedDate);
            const year = sameDay.getFullYear();
            const month = String(sameDay.getMonth() + 1).padStart(2, "0");
            const day = String(sameDay.getDate()).padStart(2, "0");
            const formattedDate = `${day}-${month}-${year}`;

            // Update return date picker
            this.returnFlatpickr.set("minDate", sameDay);
            this.returnFlatpickr.setDate(formattedDate);
          }
        },
      });

      // Initialize return date picker
      this.returnFlatpickr = flatpickr(returnInput, {
        dateFormat: this.dateFormat,
        altFormat: this.dateFormat,
        altInput: false,
        minDate: "today", // ✅ БЛОКИРОВКА ПРОШЛОГО
        defaultDate: firstAvailableReturnDate,
        disable: [disableOccupiedDates], // ✅ Функция вместо массива
        allowInput: false,
        static: this.isModal ? true : false,
        appendTo: document.body,
        position: this.isModal ? "above" : "below",
        disableMobile: true,
        closeOnSelect: true,
        locale: {
          months: {
            shorthand: [
              "Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ],
            longhand: [
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"
            ],
          },
          weekdays: {
            shorthand: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            longhand: [
              "Sunday", "Monday", "Tuesday", "Wednesday",
              "Thursday", "Friday", "Saturday"
            ],
          },
        },
        onDayCreate: addOccupiedClass, // ✅ Добавляем класс к занятым датам
        onChange: (selectedDates, dateStr, instance) => {
          if (this.onDateChange) {
            this.onDateChange();
          }
        },
        onReady: (selectedDates, dateStr, instance) => {
          if (this.customClass) {
            instance.calendarContainer.classList.add(this.customClass);
          }
        },
      });

      // Add event listeners to time select elements
      const pickupTimeSelect = document.getElementById("pickup-time");
      const returnTimeSelect = document.getElementById("collection-time");

      if (pickupTimeSelect) {
        pickupTimeSelect.addEventListener("change", () => {
          if (
            window.priceCalculator &&
            typeof window.priceCalculator.recalculatePrice === "function"
          ) {
            window.priceCalculator.recalculatePrice();
          }
        });
      }

      if (returnTimeSelect) {
        returnTimeSelect.addEventListener("change", () => {
          if (
            window.priceCalculator &&
            typeof window.priceCalculator.recalculatePrice === "function"
          ) {
            window.priceCalculator.recalculatePrice();
          }
        });
      }

      // Store references globally
      window.pickupFlatpickr = this.pickupFlatpickr;
      window.returnFlatpickr = this.returnFlatpickr;

      // Set up outside hours notice functionality
      this.setupOutsideHoursNotice();

      // Trigger price calculator after initialization
      setTimeout(() => {
        if (this.onDateChange && typeof this.onDateChange === "function") {
          this.onDateChange();
        }
      }, 200);
    } else {
      console.error("Date inputs not found!");
    }
  }

  fixMobileDatePickerStyling() {
    const mobileCSS = `
      .flatpickr-rContainer {
        overflow: hidden !important;
      }
      .flatpickr-wrapper {
        width: 100% !important;
      }
      @media (max-width: 768px) {
        .flatpickr-input {
          font-size: 12px !important;
          padding: 6px !important;
          width: 100% !important;
          line-height: 18px !important;
        }
        .flatpickr-calendar {
          width: 260px !important;
          max-width: calc(100vw - 16px) !important;
        }
      }
    `;

    if (!document.getElementById("mobile-date-picker-styles")) {
      const style = document.createElement("style");
      style.id = "mobile-date-picker-styles";
      style.textContent = mobileCSS;
      document.head.appendChild(style);
    }
  }

  async initialize() {
    try {
      if (this.carId) {
        const unavailableDates = await this.loadUnavailableDates(this.carId);
        await this.initializeFlatpickrWithUnavailableDates(unavailableDates);
      } else {
        await this.initializeFlatpickrWithUnavailableDates([]);
      }
    } catch (error) {
      console.error("❌ DatePickerManager initialization failed:", error);
      try {
        await this.initializeFlatpickrWithUnavailableDates([]);
      } catch (fallbackError) {
        console.error("❌ Fallback initialization also failed:", fallbackError);
      }
    }

    this.fixMobileDatePickerStyling();
  }

  getDateValues() {
    const pickupInput = document.getElementById(this.pickupInputId);
    const returnInput = document.getElementById(this.returnInputId);

    return {
      pickupDate: pickupInput ? pickupInput.value : "",
      returnDate: returnInput ? returnInput.value : "",
      pickupDateISO: pickupInput
        ? this.convertDateFormatToISO(pickupInput.value)
        : "",
      returnDateISO: returnInput
        ? this.convertDateFormatToISO(returnInput.value)
        : "",
    };
  }

  setupOutsideHoursNotice() {
    if (!window.priceCalculator || !window.currentCarData) {
      return;
    }
    
    const pickupTimeSelect = document.getElementById("pickup-time");
    const returnTimeSelect = document.getElementById("collection-time");

    if (!pickupTimeSelect || !returnTimeSelect) {
      return;
    }

    const updateOutsideHoursNotice = () => {
      if (
        window.priceCalculator &&
        window.priceCalculator.updateOutsideHoursNotice
      ) {
        const pickupTime = pickupTimeSelect.value || "09:00";
        const returnTime = returnTimeSelect.value || "09:00";
        window.priceCalculator.updateOutsideHoursNotice(pickupTime, returnTime);
      }
    };

    pickupTimeSelect.addEventListener("change", updateOutsideHoursNotice);
    returnTimeSelect.addEventListener("change", updateOutsideHoursNotice);

    setTimeout(() => updateOutsideHoursNotice(), 50);

    this.loadFeeSettings();
  }

  async loadFeeSettings() {
    try {
      const response = await fetch(
        `${window.API_BASE_URL}/api/fee-settings/public`
      );
      if (response.ok) {
        const fees = await response.json();

        const outsideHoursFeeElement =
          document.getElementById("outside-hours-fee");
        if (outsideHoursFeeElement && fees.outside_hours_fee !== undefined) {
          outsideHoursFeeElement.textContent = `€${fees.outside_hours_fee}`;
        }
      }
    } catch (error) {
      console.warn("Failed to load fee settings:", error);
    }
  }

  destroy() {
    if (this.pickupFlatpickr) {
      this.pickupFlatpickr.destroy();
      this.pickupFlatpickr = null;
    }
    if (this.returnFlatpickr) {
      this.returnFlatpickr.destroy();
      this.returnFlatpickr = null;
    }
  }
}

// Make DatePickerManager available globally
window.DatePickerManager = DatePickerManager;
