// lib/time.js
export function getISTDateTime() {
  const now = new Date();
 
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
 
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  const parts = formatter.formatToParts(now);
 
  const dateParts = {};
  parts.forEach(({ type, value }) => {
    dateParts[type] = value;
  });
 
  return `${dateParts.year}-${dateParts.month}-${dateParts.day} ${dateParts.hour}:${dateParts.minute}:${dateParts.second}`;
}