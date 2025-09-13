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
        // Convert unavailable dates from YYYY-MM-DD to d-m-Y format for Flatpickr
        const convertedUnavailableDates = unavailableDates.map((date) => {
          const parts = date.split("-");
          return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert YYYY-MM-DD to dd-mm-yyyy
        });

        // Apply to existing instances
        if (this.pickupFlatpickr) {
          this.pickupFlatpickr.set("disable", convertedUnavailableDates);
        }
        if (this.returnFlatpickr) {
          this.returnFlatpickr.set("disable", convertedUnavailableDates);
        }
      }

      // But still trigger callback if dates are set
      setTimeout(() => {
        if (this.onDateChange && typeof this.onDateChange === "function") {
          this.onDateChange();
        }
      }, 100);
      return;
    }

    const pickupInput = document.getElementById(this.pickupInputId);
    const returnInput = document.getElementById(this.returnInputId);
    console.log("🔵 Found inputs:", pickupInput, returnInput);
    if (pickupInput && returnInput) {
      console.log("🔵 Found inputs:", pickupInput, returnInput);
      // Remove any existing daterangepicker instances
      if ($(pickupInput).data("daterangepicker")) {
        $(pickupInput).data("daterangepicker").remove();
      }
      if ($(returnInput).data("daterangepicker")) {
        $(returnInput).data("daterangepicker").remove();
      }

      // Calculate dates
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      // Filter unavailable dates to only include future dates
      const futureUnavailableDates = unavailableDates.filter(
        (date) => date >= tomorrowStr
      );

      // Convert unavailable dates from YYYY-MM-DD to d-m-Y format for Flatpickr
      const convertedUnavailableDates = futureUnavailableDates.map((date) => {
        const parts = date.split("-");
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert YYYY-MM-DD to dd-mm-yyyy
      });

      // Find first available dates - allow today for pickup
      const firstAvailablePickupDate = this.findFirstAvailableDate(
        today,
        futureUnavailableDates
      );
      const firstAvailableReturnDate = this.findFirstAvailableDate(
        tomorrow,
        futureUnavailableDates
      );

      // FIX FLICKERING: Set correct initial values immediately before Flatpickr initialization
      pickupInput.value = firstAvailablePickupDate;
      returnInput.value = firstAvailableReturnDate;
      pickupInput.setAttribute("value", firstAvailablePickupDate);
      returnInput.setAttribute("value", firstAvailableReturnDate);

      // Monitor for any changes to pickup input
      const pickupObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "value"
          ) {
          }
        });
      });
      pickupObserver.observe(pickupInput, {
        attributes: true,
        attributeFilter: ["value"],
      });

      // Also monitor the value property
      let lastPickupValue = pickupInput.value;
      const pickupValueCheck = setInterval(() => {
        if (pickupInput.value !== lastPickupValue) {
          lastPickupValue = pickupInput.value;
        }
      }, 50);

      // Stop monitoring after 5 seconds
      setTimeout(() => {
        pickupObserver.disconnect();
        clearInterval(pickupValueCheck);
      }, 5000);

      // Initialize pickup date picker

      this.pickupFlatpickr = flatpickr(pickupInput, {
        dateFormat: this.dateFormat, // "d-m-Y"
        altFormat: this.dateFormat, // Force same format on mobile
        altInput: false, // Disable alt input to prevent format switching
        minDate: firstAvailablePickupDate,
        defaultDate: firstAvailablePickupDate,
        disable: convertedUnavailableDates,
        allowInput: false,
        static: this.isModal ? true : false,
        appendTo: document.body,
        position: this.isModal ? "above" : "below",
        closeOnSelect: true,
        disableMobile: true,
        locale: {
          months: {
            shorthand: [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ],
            longhand: [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ],
          },
          weekdays: {
            shorthand: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            longhand: [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
          },
        },
        onChange: (selectedDates, dateStr, instance) => {
          if (selectedDates.length > 0) {
            const selectedDate = selectedDates[0];
            // Set return date to exactly the same date as pickup date
            const sameDay = new Date(selectedDate);

            // Convert to the correct format (dd-mm-yyyy)
            const year = sameDay.getFullYear();
            const month = String(sameDay.getMonth() + 1).padStart(2, "0");
            const day = String(sameDay.getDate()).padStart(2, "0");
            const formattedDate = `${day}-${month}-${year}`;

            // Update return date picker's minimum date to allow same day
            this.returnFlatpickr.set("minDate", sameDay);
            this.returnFlatpickr.setDate(formattedDate);
          }
        },
        onReady: () => {
          // Fix styling immediately when calendar is ready
        },
      });

      // Initialize return date picker
      this.returnFlatpickr = flatpickr(returnInput, {
        dateFormat: this.dateFormat,
        altFormat: this.dateFormat,
        altInput: false,
        minDate: firstAvailablePickupDate,
        defaultDate: firstAvailablePickupDate,
        disable: convertedUnavailableDates,
        allowInput: false,
        static: this.isModal ? true : false,
        appendTo: document.body,
        position: this.isModal ? "above" : "below",
        disableMobile: true,
        closeOnSelect: true,
        locale: {
          months: {
            shorthand: [
              "Jan",
              "Feb",
              "Mar",
              "Apr",
              "May",
              "Jun",
              "Jul",
              "Aug",
              "Sep",
              "Oct",
              "Nov",
              "Dec",
            ],
            longhand: [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ],
          },
          weekdays: {
            shorthand: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            longhand: [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
          },
        },
        onChange: (selectedDates, dateStr, instance) => {
          setTimeout(() => {
            instance.close();
          }, 50);

          if (this.onDateChange) {
            this.onDateChange();
          }
        },
        onReady: (selectedDates, dateStr, instance) => {
          if (this.customClass) {
            instance.calendarContainer.classList.add(this.customClass);
          }
        },
        onOpen: (selectedDates, dateStr, instance) => {
          const calendar = instance.calendarContainer;

          const positionCalendar = () => {
            // const inputRect = returnInput.getBoundingClientRect();
            // calendar.style.position = "fixed";
            // calendar.style.zIndex = "99999";
            // calendar.style.top = inputRect.bottom + 10 + "px";
            // calendar.style.left = inputRect.left + "px"; // align with input
            // calendar.style.margin = "0";
          };

          // Initial positioning
          // setTimeout(positionCalendar, 10);

          // Keep updating position on scroll & resize
          // window.addEventListener("scroll", positionCalendar, true);
          // window.addEventListener("resize", positionCalendar);

          // Clean up when closed
          // instance._handlers.push({
          //   remove: () => {
          //     window.removeEventListener("scroll", positionCalendar, true);
          //     window.removeEventListener("resize", positionCalendar);
          //   },
          // });
        },
      });

      // Add event listeners to time select elements to trigger price recalculation
      const pickupTimeSelect = document.getElementById("pickup-time");
      const returnTimeSelect = document.getElementById("collection-time");

      if (pickupTimeSelect) {
        pickupTimeSelect.addEventListener("change", () => {
          if (
            window.priceCalculator &&
            typeof window.priceCalculator.recalculatePrice === "function"
          ) {
            window.priceCalculator.recalculatePrice();
          } else {
          }
        });
      } else {
      }

      if (returnTimeSelect) {
        returnTimeSelect.addEventListener("change", () => {
          if (
            window.priceCalculator &&
            typeof window.priceCalculator.recalculatePrice === "function"
          ) {
            window.priceCalculator.recalculatePrice();
          } else {
          }
        });
      } else {
      }

      // DEBUG: Monitor for flickering by checking values at intervals
      let checkCount = 0;
      const checkForFlickering = () => {
        checkCount++;
        const pickupValue = pickupInput.value;
        const returnValue = returnInput.value;

        // Check if values are changing unexpectedly
        if (checkCount > 1) {
          const prevPickupValue = window.lastPickupValue;
          const prevReturnValue = window.lastReturnValue;

          if (pickupValue !== prevPickupValue) {
          }
          if (returnValue !== prevReturnValue) {
          }
        }

        window.lastPickupValue = pickupValue;
        window.lastReturnValue = returnValue;
      };

      // Check immediately and then every 100ms for the first 2 seconds
      checkForFlickering();
      const flickeringInterval = setInterval(checkForFlickering, 100);
      setTimeout(() => {
        clearInterval(flickeringInterval);
      }, 2000);

      // DEBUG: Check the final Flatpickr configuration

      // DEBUG: Test the actual date display
      setTimeout(() => {
        // DEBUG: Check if Flatpickr instances have selected dates

        // DEBUG: Try different format strings
        if (
          this.pickupFlatpickr &&
          this.pickupFlatpickr.selectedDates &&
          this.pickupFlatpickr.selectedDates.length > 0
        ) {
          const selectedDate = this.pickupFlatpickr.selectedDates[0];
        } else {
        }

        if (
          this.returnFlatpickr &&
          this.returnFlatpickr.selectedDates &&
          this.returnFlatpickr.selectedDates.length > 0
        ) {
          const selectedDate = this.returnFlatpickr.selectedDates[0];
        } else {
        }
      }, 1000);

      // Store references globally
      window.pickupFlatpickr = this.pickupFlatpickr;
      window.returnFlatpickr = this.returnFlatpickr;

      // Set up outside hours notice functionality
      this.setupOutsideHoursNotice();

      // CRITICAL: Trigger price calculator after dates are initialized
      setTimeout(() => {
        if (this.onDateChange && typeof this.onDateChange === "function") {
          this.onDateChange();
        }
      }, 200); // Small delay to ensure Flatpickr and PriceCalculator are fully ready
    } else {
      console.error("Date inputs not found!");
    }

    // Fix positioning and styling for modal context
    // if (document.getElementById("price-calculator-modal")) {
    //   setTimeout(() => {
    //     const calendars = document.querySelectorAll(".flatpickr-calendar");
    //     calendars.forEach((calendar) => {
    //       // Check if this calendar belongs to the return date picker
    //       const returnInput = document.getElementById(this.returnInputId);
    //       const isReturnCalendar =
    //         (returnInput && calendar.contains(returnInput)) ||
    //         (returnInput._flatpickr &&
    //           returnInput._flatpickr.calendarContainer === calendar);

    //       if (isReturnCalendar) {
    //         // Position the return date picker calendar relative to its input field
    //         const returnInput = document.getElementById(this.returnInputId);
    //         if (returnInput) {
    //           const inputRect = returnInput.getBoundingClientRect();

    //           calendar.style.position = "fixed";
    //           calendar.style.zIndex = "99999";
    //           calendar.style.top = inputRect.bottom + 10 + "px"; // 10px below the input
    //           calendar.style.left = inputRect.left + inputRect.width / 2 + "px"; // Add this back
    //           calendar.style.transform = "translateX(-50%)"; // Center horizontally
    //           calendar.style.margin = "0";
    //         } else {
    //           // Fallback to viewport center if input not found
    //           calendar.style.position = "fixed";
    //           calendar.style.zIndex = "99999";
    //           calendar.style.top = "50%";
    //           calendar.style.transform = "translate(-50%, -50%)";
    //           calendar.style.margin = "0";
    //         }
    //       } else {
    //         // Keep pickup calendar in its normal position
    //         calendar.style.position = "absolute";
    //         calendar.style.zIndex = "99999";
    //         calendar.style.top = "auto";
    //         calendar.style.right = "auto";
    //         calendar.style.bottom = "auto";
    //       }

    //       // Apply common styling to both calendars
    //       const dayElements = calendar.querySelectorAll(".flatpickr-day");
    //       dayElements.forEach((day) => {
    //         day.style.width = "39px";
    //         day.style.height = "39px";
    //         day.style.lineHeight = "39px";
    //         day.style.display = "inline-block";
    //         day.style.textAlign = "center";
    //         day.style.margin = "0";
    //         day.style.padding = "0";
    //         day.style.border = "none";
    //         day.style.background = "transparent";
    //         day.style.fontSize = "14px";
    //         day.style.fontWeight = "normal";
    //       });

    //       // Fix the calendar container
    //       calendar.style.width = "auto";
    //       calendar.style.minWidth = "280px";
    //       calendar.style.fontFamily = "system-ui, -apple-system, sans-serif";
    //       calendar.style.fontSize = "14px";
    //     });
    //   }, 100);
    // }
  }

  // Add this method to the DatePickerManager class
  // Add this method to the DatePickerManager class
  // Add this method to the DatePickerManager class
  fixMobileDatePickerStyling() {
    // Add mobile-specific CSS for date picker inputs
    const mobileCSS = `
    // .flatpickr-wrapper {
    //   width: 268.812px !important;
    //   max-width: none !important;
    // }
    
    // .flatpickr-input {
    //   font-size: 14px !important;
    //   padding: 8px !important;
    //   text-align: left !important;
    //   width: 268.812px !important;
    //   height: 48px !important;
    //   line-height: 21px !important;
    //   box-sizing: border-box !important;
    //   font-family: Inter, Helvetica, Arial, sans-serif !important;
    //   font-weight: 400 !important;
    //   border: 1px solid #ccc !important;
    //   border-radius: 3.2px !important;
    //   background-color: white !important;
    //   color: #333 !important;
    //   transition: all 0.1s linear !important;
    // }
    
    // .flatpickr-calendar {
    //   font-size: 14px !important;
    //   width: 280px !important;
    //   max-width: calc(100vw - 20px) !important;
    //   z-index: 99999 !important;
    //   box-sizing: border-box !important;
    // }
    .flatpickr-rContainer{
    overflow:hidden !important;
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
    
    // @media (max-width: 480px) {
    //   .flatpickr-wrapper {
    //     width: 200px !important;
    //   }
      
    //   .flatpickr-input {
    //     width: 200px !important;
    //     height: 40px !important;
    //   }
      
    //   .flatpickr-calendar {
    //     width: 240px !important;
    //     max-width: calc(100vw - 12px) !important;
    //   }
    // }
  `;

    // Inject the CSS if not already present
    if (!document.getElementById("mobile-date-picker-styles")) {
      const style = document.createElement("style");
      style.id = "mobile-date-picker-styles";
      style.textContent = mobileCSS;
      document.head.appendChild(style);
    }
  }

  // Initialize the date picker
  async initialize() {
    console.log(
      "�� DatePickerManager initialize() called with carId:",
      this.carId
    );

    try {
      if (this.carId) {
        console.log("🔵 Loading unavailable dates for carId:", this.carId);
        const unavailableDates = await this.loadUnavailableDates(this.carId);
        console.log(
          "🔵 Loaded unavailable dates:",
          unavailableDates.length,
          "dates"
        );
        await this.initializeFlatpickrWithUnavailableDates(unavailableDates);
      } else {
        console.log("�� No carId, initializing with empty unavailable dates");
        await this.initializeFlatpickrWithUnavailableDates([]);
      }

      console.log("🔵 DatePickerManager initialization complete");
    } catch (error) {
      console.error("❌ DatePickerManager initialization failed:", error);
      // Fallback: try to initialize with empty unavailable dates
      try {
        console.log("🔵 Attempting fallback initialization");
        await this.initializeFlatpickrWithUnavailableDates([]);
      } catch (fallbackError) {
        console.error("❌ Fallback initialization also failed:", fallbackError);
      }
    }

    // Fix mobile styling
    this.fixMobileDatePickerStyling();
  }
  // Get current date values
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

  // Set up outside hours notice functionality
  setupOutsideHoursNotice() {
    // Only set up if price calculator is ready
    if (!window.priceCalculator || !window.currentCarData) {
      return; // Don't retry, just skip this setup
    }
    const pickupTimeSelect = document.getElementById("pickup-time");
    const returnTimeSelect = document.getElementById("collection-time");

    if (!pickupTimeSelect || !returnTimeSelect) {
      return; // Don't retry, just skip this setup
    }

    // Function to update outside hours notice
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

    // Set up event listeners
    pickupTimeSelect.addEventListener("change", updateOutsideHoursNotice);
    returnTimeSelect.addEventListener("change", updateOutsideHoursNotice);

    // Initial update
    setTimeout(() => updateOutsideHoursNotice(), 50);

    // Load fee settings for outside hours fee display
    this.loadFeeSettings();
  }

  // Load fee settings for outside hours fee display
  async loadFeeSettings() {
    try {
      const response = await fetch(
        `${window.API_BASE_URL}/api/fee-settings/public`
      );
      if (response.ok) {
        const fees = await response.json();

        // Update outside hours fee display
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

  // Destroy the date picker instances
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
