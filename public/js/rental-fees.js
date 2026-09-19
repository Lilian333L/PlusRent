/**
 * The rules that decide what a rental costs beyond the daily rate.
 *
 * These lived in three places (price-calculator.js for the car page and twice
 * inside validation-booking.js for the home page modal), which is how the home
 * page came to charge an airport fee that the car page waived. One copy now.
 *
 * Rules, as the business states them:
 *   - a rental day is 24 hours from handover, so 12:00 to 12:00 next day is one
 *     day and 12:00 to 13:00 is two;
 *   - from FREE_DELIVERY_FROM_DAYS rental days up, Chisinau delivery costs
 *     nothing at any hour, including outside working hours;
 *   - shorter rentals pay the airport fee, and outside working hours pay the
 *     out-of-hours fee on top;
 *   - Iasi airport is always charged, whatever the length.
 *
 * The threshold is read from the fee settings (free_delivery_from_days) so it
 * can be changed in the dashboard without touching this file.
 */
(function (root) {
  "use strict";

  var DEFAULT_FREE_FROM_DAYS = 7;
  var WORK_START_HOUR = 8;
  var WORK_END_HOUR = 18;
  var CHISINAU_AIRPORT = "Chisinau Airport";
  var IASI_AIRPORT = "Iasi Airport";

  function num(value, fallback) {
    var n = parseFloat(value);
    return isFinite(n) ? n : fallback;
  }

  /**
   * The date pickers hand over d-m-Y ("19-09-2026") because that is what the
   * visitor reads, and new Date() cannot parse it: it returns Invalid Date, the
   * rental silently became one day and the extra-day hint never appeared. Accept
   * both spellings so every caller can pass whatever it has.
   */
  function toISO(date) {
    if (typeof date !== "string") return date;
    var s = date.trim();
    var dmy = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
    if (dmy) {
      return dmy[3] + "-" + ("0" + dmy[2]).slice(-2) + "-" + ("0" + dmy[1]).slice(-2);
    }
    return s;
  }

  function freeFromDays(feeSettings) {
    var raw = feeSettings && feeSettings.free_delivery_from_days;
    var n = num(raw, DEFAULT_FREE_FROM_DAYS);
    return n > 0 ? n : DEFAULT_FREE_FROM_DAYS;
  }

  /** True when this rental is long enough for free Chisinau delivery. */
  function deliveryIsFree(days, feeSettings) {
    return num(days, 0) >= freeFromDays(feeSettings);
  }

  /**
   * Whole rental days. A day is 24 hours from the handover moment; when no times
   * are given it falls back to whole calendar days. A late return is forgiven for
   * GRACE_MINUTES before the next day starts, so a few minutes of traffic does not
   * cost the customer a whole day.
   */
  function rentalDays(pickupDate, returnDate, pickupTime, returnTime) {
    var GRACE_MINUTES = 60;
    var DAY_MS = 86400000;
    function at(date, time) {
      var d = new Date(toISO(date));
      if (isNaN(d.getTime())) return null;
      if (time && /^\d{1,2}:\d{2}/.test(time)) {
        var parts = time.split(":");
        d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
      } else {
        d.setHours(0, 0, 0, 0);
      }
      return d;
    }
    var from = at(pickupDate, pickupTime);
    var to = at(returnDate, returnTime);
    if (!from || !to) return 1;
    var ms = to.getTime() - from.getTime() - GRACE_MINUTES * 60000;
    return Math.max(1, Math.ceil(ms / DAY_MS));
  }

  /**
   * True when the hour of the return is what pushed the rental into another day.
   * Used to explain the price: collect at 09:00 and bring it back at 23:00 the
   * next day and that is two days, not one, because a day is 24 hours.
   */
  function extraDayFromTime(pickupDate, returnDate, pickupTime, returnTime) {
    if (!pickupTime || !returnTime) return false;
    var withTimes = rentalDays(pickupDate, returnDate, pickupTime, returnTime);
    var byDate = rentalDays(pickupDate, returnDate, null, null);
    return withTimes > byDate;
  }

  /** The latest return that still fits inside the same number of days. */
  function latestReturnTime(pickupTime) {
    if (!pickupTime || !/^\d{1,2}:\d{2}/.test(pickupTime)) return null;
    var parts = pickupTime.split(":");
    var minutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + 60;
    minutes = minutes % (24 * 60);
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  /** Fee for one end of the rental: "pickup" or "dropoff". */
  function locationFee(location, direction, days, feeSettings) {
    var settings = feeSettings || {};
    var key = direction === "dropoff" ? "dropoff" : "pickup";
    if (location === CHISINAU_AIRPORT) {
      if (deliveryIsFree(days, settings)) return 0;
      return num(settings["chisinau_airport_" + key], 15);
    }
    if (location === IASI_AIRPORT) {
      return num(settings["iasi_airport_" + key], 175);
    }
    return num(settings["office_" + key], 0);
  }

  function locationFees(pickupLocation, dropoffLocation, days, feeSettings) {
    return (
      locationFee(pickupLocation, "pickup", days, feeSettings) +
      locationFee(dropoffLocation, "dropoff", days, feeSettings)
    );
  }

  function isOutsideWorkingHours(time) {
    if (!time || !/^\d{1,2}:\d{2}/.test(time)) return false;
    var hour = parseInt(time.split(":")[0], 10);
    return hour < WORK_START_HOUR || hour >= WORK_END_HOUR;
  }

  /**
   * Out-of-hours charge. A Chisinau airport handover on a rental that already
   * qualifies for free delivery is not charged for the hour either: free
   * delivery means free at any hour.
   */
  function outsideHoursFees(
    pickupTime,
    returnTime,
    days,
    pickupLocation,
    dropoffLocation,
    feeSettings
  ) {
    var settings = feeSettings || {};
    var fee = num(settings.outside_hours_fee, 15);
    var freeDelivery = deliveryIsFree(days, settings);
    var total = 0;
    if (isOutsideWorkingHours(pickupTime)) {
      if (!(freeDelivery && pickupLocation === CHISINAU_AIRPORT)) total += fee;
    }
    if (isOutsideWorkingHours(returnTime)) {
      if (!(freeDelivery && dropoffLocation === CHISINAU_AIRPORT)) total += fee;
    }
    return total;
  }

  root.RentalFees = {
    DEFAULT_FREE_FROM_DAYS: DEFAULT_FREE_FROM_DAYS,
    CHISINAU_AIRPORT: CHISINAU_AIRPORT,
    IASI_AIRPORT: IASI_AIRPORT,
    toISO: toISO,
    freeFromDays: freeFromDays,
    deliveryIsFree: deliveryIsFree,
    rentalDays: rentalDays,
    extraDayFromTime: extraDayFromTime,
    latestReturnTime: latestReturnTime,
    locationFee: locationFee,
    locationFees: locationFees,
    isOutsideWorkingHours: isOutsideWorkingHours,
    outsideHoursFees: outsideHoursFees,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.RentalFees;
  }
})(typeof window !== "undefined" ? window : globalThis);
