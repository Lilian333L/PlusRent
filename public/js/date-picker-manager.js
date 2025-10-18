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
    this.timeUpdateInterval = null;
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
    // ✅ ИСПРАВЛЕНИЕ: Создаём дату правильно, избегая timezone проблем
    const currentDate = new Date(startDate);
    
    // Устанавливаем время в LOCAL timezone, а не UTC
    currentDate.setHours(0, 0, 0, 0);
    
    let attempts = 0;
    const maxAttempts = 30; // Prevent infinite loop

    while (attempts < maxAttempts) {
      // ✅ Форматируем дату в LOCAL timezone
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      if (!unavailableDates.includes(dateStr)) {
        // Convert to dd-mm-yyyy format
        return `${day}-${month}-${year}`;
      }
      currentDate.setDate(currentDate.getDate() + 1);
      attempts++;
    }

    // Fallback: return the start date if no available date found
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${day}-${month}-${year}`;
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

        console.log('📦 Raw booking data:', data);

        if (data.booking_dates && Array.isArray(data.booking_dates)) {
          data.booking_dates.forEach((booking) => {
            if (booking.pickup_date && booking.return_date) {
              // ✅ Безопасная обработка дат без timezone проблем
              const pickupStr = booking.pickup_date.split('T')[0]; // "2025-01-20"
              const returnStr = booking.return_date.split('T')[0]; // "2025-01-25"
              
              const [pYear, pMonth, pDay] = pickupStr.split('-').map(Number);
              const [rYear, rMonth, rDay] = returnStr.split('-').map(Number);
              
              const startDate = new Date(pYear, pMonth - 1, pDay);
              const endDate = new Date(rYear, rMonth - 1, rDay);

              console.log(`🔍 Processing booking: ${pickupStr} to ${returnStr}`);

              // ✅ Добавляем ВСЕ даты включительно (включая pickup date!)
              const currentDate = new Date(startDate);
              while (currentDate <= endDate) {
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                
                console.log(`  🚫 Blocking: ${dateStr}`);
                unavailableDates.push(dateStr);
                
                currentDate.setDate(currentDate.getDate() + 1);
              }
            }
          });
        }

        console.log('✅ Total unavailable dates:', unavailableDates.length, unavailableDates);
        return unavailableDates;
      }
    } catch (error) {
      console.error("❌ Failed to load unavailable dates:", error);
    }

    return [];
  }

  // Функция для преобразования year input в dropdown
  convertYearToDropdown(instance) {
    setTimeout(() => {
      const yearInput = instance.calendarContainer.querySelector('.numInputWrapper input.cur-year');
      
      if (yearInput && !yearInput.hasAttribute('data-dropdown-applied')) {
        yearInput.setAttribute('data-dropdown-applied', 'true');
        
        // Создаем select элемент
        const yearSelect = document.createElement('select');
        yearSelect.className = 'flatpickr-year-dropdown';
        
        // Настройки диапазона лет
        const currentYear = new Date().getFullYear();
        const minYear = currentYear;  // Только текущий год
        const maxYear = currentYear + 5;  // 5 лет вперед от текущего года
        
        // Заполняем опции (от текущего до будущего)
        for (let year = minYear; year <= maxYear; year++) {
          const option = document.createElement('option');
          option.value = year;
          option.textContent = year;
          if (year === instance.currentYear) {
            option.selected = true;
          }
          yearSelect.appendChild(option);
        }
        
        // Стили для dropdown - убираем прозрачность для лучшей видимости
        yearSelect.style.cssText = `
          background: #667eea;
          color: white;
          font-weight: 700;
          border: 2px solid rgba(255, 255, 255, 0.5);
          border-radius: 8px;
          padding: 2px 6px;
          font-size: 13px;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          touch-action: manipulation;
          width: auto;
          min-width: 52px;
          text-align: center;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 2px center;
          background-size: 14px;
          padding-right: 20px;
        `;
        
        // Добавляем стили для опций dropdown с более агрессивными правилами
        const styleId = 'flatpickr-year-dropdown-styles';
        if (!document.getElementById(styleId)) {
          const style = document.createElement('style');
          style.id = styleId;
          style.textContent = `
            /* Основные стили для select */
            .flatpickr-year-dropdown {
              background-color: #667eea !important;
              color: white !important;
            }
            
            /* Стили для опций - делаем темный фон для контраста */
            .flatpickr-year-dropdown option {
              background-color: #2d3748 !important;
              color: white !important;
              padding: 8px !important;
              font-weight: 600 !important;
              text-shadow: none !important;
            }
            
            .flatpickr-year-dropdown option:hover,
            .flatpickr-year-dropdown option:focus,
            .flatpickr-year-dropdown option:checked,
            .flatpickr-year-dropdown option:active {
              background-color: #667eea !important;
              color: white !important;
              box-shadow: inset 0 0 10px rgba(0,0,0,0.3) !important;
            }
            
            /* Webkit browsers (Chrome, Safari) */
            .flatpickr-year-dropdown::-webkit-scrollbar {
              width: 8px;
            }
            
            .flatpickr-year-dropdown::-webkit-scrollbar-track {
              background: #2d3748;
            }
            
            .flatpickr-year-dropdown::-webkit-scrollbar-thumb {
              background: #667eea;
              border-radius: 4px;
            }
            
            /* Firefox specific */
            @-moz-document url-prefix() {
              .flatpickr-year-dropdown {
                background-color: #667eea !important;
                color: white !important;
              }
              
              .flatpickr-year-dropdown option {
                background-color: #2d3748 !important;
                color: white !important;
              }
            }
            
            /* Edge/IE fallback */
            _:-ms-fullscreen, :root .flatpickr-year-dropdown option {
              background-color: #2d3748 !important;
              color: white !important;
            }
          `;
          document.head.appendChild(style);
        }
        
        // Дополнительно устанавливаем атрибуты для каждой опции
        setTimeout(() => {
          const options = yearSelect.querySelectorAll('option');
          options.forEach(option => {
            option.style.backgroundColor = '#2d3748';
            option.style.color = 'white';
          });
        }, 0);
        
        // Обработчик изменения
        yearSelect.addEventListener('change', function(e) {
          instance.changeYear(parseInt(e.target.value));
        });
        
        // Скрываем оригинальный input и стрелки
        yearInput.style.display = 'none';
        const arrowUp = yearInput.parentNode.querySelector('.arrowUp');
        const arrowDown = yearInput.parentNode.querySelector('.arrowDown');
        if (arrowUp) arrowUp.style.display = 'none';
        if (arrowDown) arrowDown.style.display = 'none';
        
        // Вставляем select
        yearInput.parentNode.insertBefore(yearSelect, yearInput);
      }
      
      // Обновляем значение dropdown при изменении месяца
      const yearSelect = instance.calendarContainer.querySelector('.flatpickr-year-dropdown');
      if (yearSelect && yearSelect.value != instance.currentYear) {
        yearSelect.value = instance.currentYear;
      }
    }, 100);
  }

  // Initialize Flatpickr with unavailable dates
  async initializeFlatpickrWithUnavailableDates(unavailableDates = []) {
    // Prevent multiple initializations
    if (this.pickupFlatpickr || this.returnFlatpickr) {
      // Apply unavailable dates to existing instances
      if (unavailableDates.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // ✅ ИСПРАВЛЕНИЕ: Фильтруем unavailable dates правильно
        const futureUnavailableDates = unavailableDates.filter((date) => {
          const [year, month, day] = date.split('-').map(Number);
          const unavailableDate = new Date(year, month - 1, day);
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
            const year = checkDate.getFullYear();
            const month = String(checkDate.getMonth() + 1).padStart(2, '0');
            const day = String(checkDate.getDate()).padStart(2, '0');
            const formattedDate = `${day}-${month}-${year}`;
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
    const pickupTimeSelect = document.getElementById("pickup-time");
    const returnTimeSelect = document.getElementById("collection-time");
    
    if (pickupInput && returnInput) {
      // Remove any existing daterangepicker instances
      if ($(pickupInput).data("daterangepicker")) {
        $(pickupInput).data("daterangepicker").remove();
      }
      if ($(returnInput).data("daterangepicker")) {
        $(returnInput).data("daterangepicker").remove();
      }

      // ✅ ИСПРАВЛЕНИЕ: Создаём даты правильно в LOCAL timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      console.log('📅 Today:', today.toISOString(), 'Local:', today.toLocaleDateString());
      console.log('📅 Tomorrow:', tomorrow.toISOString(), 'Local:', tomorrow.toLocaleDateString());

      // ✅ ИСПРАВЛЕНИЕ: Фильтруем unavailable dates правильно
      const futureUnavailableDates = unavailableDates.filter((date) => {
        // date в формате "2025-01-20"
        const [year, month, day] = date.split('-').map(Number);
        const unavailableDate = new Date(year, month - 1, day);
        unavailableDate.setHours(0, 0, 0, 0);
        
        return unavailableDate >= today;
      });

      // Convert unavailable dates from YYYY-MM-DD to d-m-Y format
      const convertedUnavailableDates = futureUnavailableDates.map((date) => {
        const parts = date.split("-");
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      });

      // ✅ ИСПРАВЛЕНИЕ: Find first available dates using corrected function
      const firstAvailablePickupDate = this.findFirstAvailableDate(
        today,
        futureUnavailableDates
      );
      const firstAvailableReturnDate = this.findFirstAvailableDate(
        tomorrow,
        futureUnavailableDates
      );

      console.log('📅 First available pickup:', firstAvailablePickupDate);
      console.log('📅 First available return:', firstAvailableReturnDate);

      // Set initial values
      pickupInput.value = firstAvailablePickupDate;
      returnInput.value = firstAvailableReturnDate;
      pickupInput.setAttribute("value", firstAvailablePickupDate);
      returnInput.setAttribute("value", firstAvailableReturnDate);

const hidePastDates = function(date) {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  // Проверяем, является ли дата занятой
  const year = checkDate.getFullYear();
  const month = String(checkDate.getMonth() + 1).padStart(2, '0');
  const day = String(checkDate.getDate()).padStart(2, '0');
  const formattedDate = `${day}-${month}-${year}`;
  const isOccupied = convertedUnavailableDates.includes(formattedDate);
  
  // Показываем занятые даты начиная с СЕГОДНЯ
  // Скрываем только свободные прошлые даты
  if (checkDate < today) {
    return !isOccupied; // Если прошлая дата занята - показываем, иначе скрываем
  }
  
  return false; // Все будущие даты показываем
};
      // Disable function for occupied dates with styling
      const disableOccupiedDates = function(date) {
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const year = checkDate.getFullYear();
        const month = String(checkDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkDate.getDate()).padStart(2, '0');
        const formattedDate = `${day}-${month}-${year}`;
        return convertedUnavailableDates.includes(formattedDate);
      };

      // ✅ КРИТИЧЕСКАЯ ФУНКЦИЯ: Добавляет класс .occupied к занятым датам
      const addOccupiedClass = (dObj, dStr, fp, dayElem) => {
        const date = dayElem.dateObj;
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        const year = checkDate.getFullYear();
        const month = String(checkDate.getMonth() + 1).padStart(2, '0');
        const day = String(checkDate.getDate()).padStart(2, '0');
        const formattedDate = `${day}-${month}-${year}`;
        
        if (convertedUnavailableDates.includes(formattedDate)) {
          dayElem.classList.add('occupied');
        }
      };

      // ✅ ФУНКЦИЯ: Блокировка прошедшего времени для сегодняшнего дня
      const updateAvailableTime = () => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Получаем выбранную дату pickup
        const pickupDate = this.pickupFlatpickr.selectedDates[0];
        if (!pickupDate) return;

        const selectedDate = new Date(pickupDate);
        selectedDate.setHours(0, 0, 0, 0);
        
        const todayCheck = new Date();
        todayCheck.setHours(0, 0, 0, 0);

        // Если выбран сегодняшний день
        const isToday = selectedDate.getTime() === todayCheck.getTime();

        if (pickupTimeSelect && isToday) {
          // Блокируем прошедшее время
          Array.from(pickupTimeSelect.options).forEach(option => {
            const [hours, minutes] = option.value.split(':').map(Number);
            
            // Если время уже прошло
            if (hours < currentHour || (hours === currentHour && minutes <= currentMinute)) {
              option.disabled = true;
              option.style.color = '#ccc';
            } else {
              option.disabled = false;
              option.style.color = '';
            }
          });

          // Если текущее выбранное время уже прошло, выбираем следующее доступное
          const selectedValue = pickupTimeSelect.value;
          const [selectedHours, selectedMinutes] = selectedValue.split(':').map(Number);
          
          if (selectedHours < currentHour || (selectedHours === currentHour && selectedMinutes <= currentMinute)) {
            // Находим следующий доступный час
            let nextAvailableHour = currentHour + 1;
            if (nextAvailableHour > 23) nextAvailableHour = 23;
            
            const nextTimeValue = `${String(nextAvailableHour).padStart(2, '0')}:00`;
            const nextOption = Array.from(pickupTimeSelect.options).find(opt => opt.value === nextTimeValue);
            
            if (nextOption && !nextOption.disabled) {
              pickupTimeSelect.value = nextTimeValue;
            } else {
              // Находим первый доступный вариант
              const firstAvailable = Array.from(pickupTimeSelect.options).find(opt => !opt.disabled);
              if (firstAvailable) {
                pickupTimeSelect.value = firstAvailable.value;
              }
            }
            
            // Триггерим событие изменения для пересчёта цены
            pickupTimeSelect.dispatchEvent(new Event('change'));
          }
        } else if (pickupTimeSelect) {
          // Если выбрана будущая дата - разблокировать всё время
          Array.from(pickupTimeSelect.options).forEach(option => {
            option.disabled = false;
            option.style.color = '';
          });
        }

        // Аналогично для return time
        if (returnTimeSelect) {
          const returnDate = this.returnFlatpickr.selectedDates[0];
          if (!returnDate) return;

          const selectedReturnDate = new Date(returnDate);
          selectedReturnDate.setHours(0, 0, 0, 0);

          const isSameDay = selectedDate.getTime() === selectedReturnDate.getTime();
          const isReturnToday = selectedReturnDate.getTime() === todayCheck.getTime();

          if (isReturnToday && !isSameDay) {
            // Блокируем прошедшее время для return если это сегодня (но не тот же день что pickup)
            Array.from(returnTimeSelect.options).forEach(option => {
              const [hours, minutes] = option.value.split(':').map(Number);
              
              if (hours < currentHour || (hours === currentHour && minutes <= currentMinute)) {
                option.disabled = true;
                option.style.color = '#ccc';
              } else {
                option.disabled = false;
                option.style.color = '';
              }
            });

            // Проверяем выбранное время
            const selectedReturnValue = returnTimeSelect.value;
            const [retHours, retMinutes] = selectedReturnValue.split(':').map(Number);
            
            if (retHours < currentHour || (retHours === currentHour && retMinutes <= currentMinute)) {
              let nextAvailableHour = currentHour + 1;
              if (nextAvailableHour > 23) nextAvailableHour = 23;
              
              const nextTimeValue = `${String(nextAvailableHour).padStart(2, '0')}:00`;
              const nextOption = Array.from(returnTimeSelect.options).find(opt => opt.value === nextTimeValue);
              
              if (nextOption && !nextOption.disabled) {
                returnTimeSelect.value = nextTimeValue;
              } else {
                const firstAvailable = Array.from(returnTimeSelect.options).find(opt => !opt.disabled);
                if (firstAvailable) {
                  returnTimeSelect.value = firstAvailable.value;
                }
              }
              
              returnTimeSelect.dispatchEvent(new Event('change'));
            }
          } else if (isSameDay) {
            // Если pickup и return в один день, return должен быть после pickup
            const pickupValue = pickupTimeSelect.value;
            const [pickupHours, pickupMinutes] = pickupValue.split(':').map(Number);

            Array.from(returnTimeSelect.options).forEach(option => {
              const [hours, minutes] = option.value.split(':').map(Number);
              
              // Блокируем время, которое раньше или равно pickup времени
              if (hours < pickupHours || (hours === pickupHours && minutes <= pickupMinutes)) {
                option.disabled = true;
                option.style.color = '#ccc';
              } else {
                option.disabled = false;
                option.style.color = '';
              }
            });

            // Проверяем выбранное return время
            const selectedReturnValue = returnTimeSelect.value;
            const [retHours, retMinutes] = selectedReturnValue.split(':').map(Number);
            
            if (retHours < pickupHours || (retHours === pickupHours && retMinutes <= pickupMinutes)) {
              const nextAvailableHour = pickupHours + 1;
              const nextTimeValue = `${String(nextAvailableHour).padStart(2, '0')}:00`;
              const nextOption = Array.from(returnTimeSelect.options).find(opt => opt.value === nextTimeValue);
              
              if (nextOption && !nextOption.disabled) {
                returnTimeSelect.value = nextTimeValue;
              } else {
                const firstAvailable = Array.from(returnTimeSelect.options).find(opt => !opt.disabled);
                if (firstAvailable) {
                  returnTimeSelect.value = firstAvailable.value;
                }
              }
              
              returnTimeSelect.dispatchEvent(new Event('change'));
            }
          } else {
            // Разблокировать всё время если разные дни
            Array.from(returnTimeSelect.options).forEach(option => {
              option.disabled = false;
              option.style.color = '';
            });
          }
        }
      };

      // Настройки для обоих date picker с year dropdown
      const currentYear = new Date().getFullYear();
      const maxDate = new Date(currentYear + 5, 11, 31); // 31 декабря через 5 лет

// Initialize pickup date picker
this.pickupFlatpickr = flatpickr(pickupInput, {
  dateFormat: this.dateFormat,
  altFormat: this.dateFormat,
  altInput: false,
  minDate: "today",
  maxDate: maxDate, // Ограничиваем максимальную дату
  defaultDate: firstAvailablePickupDate,
  disable: [disableOccupiedDates, hidePastDates],
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
  onDayCreate: addOccupiedClass,
  onOpen: (selectedDates, dateStr, instance) => {
    this.convertYearToDropdown(instance);
  },
  onMonthChange: (selectedDates, dateStr, instance) => {
    this.convertYearToDropdown(instance);
  },
  onChange: (selectedDates, dateStr, instance) => {
    // ✅ Добавляем класс hasSelected при выборе даты
    if (selectedDates.length > 0) {
      instance.calendarContainer.classList.add('hasSelected');
    } else {
      instance.calendarContainer.classList.remove('hasSelected');
    }
    
    // Существующий код
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
      
      // ✅ Обновляем доступное время после выбора даты
      setTimeout(() => updateAvailableTime(), 50);
    }
  },
  onReady: (selectedDates, dateStr, instance) => {
    // ✅ Добавляем класс hasSelected если дата уже выбрана
    if (selectedDates.length > 0) {
      instance.calendarContainer.classList.add('hasSelected');
    }
    
    // ✅ Обновляем время при загрузке
    setTimeout(() => updateAvailableTime(), 100);
  },
});

      // Initialize return date picker
      this.returnFlatpickr = flatpickr(returnInput, {
        dateFormat: this.dateFormat,
        altFormat: this.dateFormat,
        altInput: false,
        minDate: "today",
        maxDate: maxDate, // Ограничиваем максимальную дату
        defaultDate: firstAvailableReturnDate,
        disable: [disableOccupiedDates, hidePastDates],
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
onDayCreate: addOccupiedClass,
onOpen: (selectedDates, dateStr, instance) => {
  this.convertYearToDropdown(instance);
},
onMonthChange: (selectedDates, dateStr, instance) => {
  this.convertYearToDropdown(instance);
},
onChange: (selectedDates, dateStr, instance) => {
  // ✅ Добавляем класс hasSelected при выборе даты
  if (selectedDates.length > 0) {
    instance.calendarContainer.classList.add('hasSelected');
  } else {
    instance.calendarContainer.classList.remove('hasSelected');
  }
  
  // Существующий код
  if (this.onDateChange) {
    this.onDateChange();
  }
  // ✅ Обновляем время после выбора return даты
  setTimeout(() => updateAvailableTime(), 50);
},
onReady: (selectedDates, dateStr, instance) => {
  // ✅ Добавляем класс hasSelected если дата уже выбрана
  if (selectedDates.length > 0) {
    instance.calendarContainer.classList.add('hasSelected');
  }
  
  // Существующий код
  if (this.customClass) {
    instance.calendarContainer.classList.add(this.customClass);
  }
  // ✅ Обновляем время при загрузке
  setTimeout(() => updateAvailableTime(), 100);
},
});

// Add event listeners to time select elements
if (pickupTimeSelect) {
  pickupTimeSelect.addEventListener("change", () => {
    // ✅ Обновляем доступное время при изменении pickup time
    updateAvailableTime();
    
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

      // ✅ ОПТИМИЗАЦИЯ: Умная проверка времени с минимальной нагрузкой
      let lastUpdateHour = new Date().getHours();

      // Функция проверки и обновления
      const checkAndUpdateTime = () => {
        const currentHour = new Date().getHours();
        if (currentHour !== lastUpdateHour) {
          console.log(`⏰ Hour changed: ${lastUpdateHour} → ${currentHour}`);
          updateAvailableTime();
          lastUpdateHour = currentHour;
        }
      };

      // Обновляем при возврате на страницу
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          checkAndUpdateTime();
        }
      });

      // Обновляем при фокусе на время
      if (pickupTimeSelect) {
        pickupTimeSelect.addEventListener('focus', checkAndUpdateTime);
        pickupTimeSelect.addEventListener('click', checkAndUpdateTime);
      }

      if (returnTimeSelect) {
        returnTimeSelect.addEventListener('focus', checkAndUpdateTime);
        returnTimeSelect.addEventListener('click', checkAndUpdateTime);
      }

      // ✅ Проверяем раз в 10 минут как резерв (только если выбран сегодняшний день)
      const safetyCheckInterval = setInterval(() => {
        const pickupDate = this.pickupFlatpickr?.selectedDates[0];
        if (!pickupDate) return;
        
        const selectedDate = new Date(pickupDate);
        selectedDate.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Только если выбран сегодняшний день
        if (selectedDate.getTime() === today.getTime()) {
          checkAndUpdateTime();
        }
      }, 600000); // 10 минут

      // Сохраняем для очистки
      this.timeUpdateInterval = safetyCheckInterval;

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
    // ✅ Очищаем interval при уничтожении
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
    
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
