// lib/time.js
export function getISTDateTime() {
  const now = new Date();
  
  // Convert to IST by adding 5.5 hours offset
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  
  return istTime;
}

// If you need the formatted string version, create a separate function
export function getISTDateTimeString() {
  const now = new Date();
 
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  };
 
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  const parts = formatter.formatToParts(now);
 
  const dateParts = {};
  parts.forEach(({ type, value }) => {
    dateParts[type] = value;
  });
 
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}.${dateParts.fractionalSecond}Z`;
}