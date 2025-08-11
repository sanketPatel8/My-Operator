// // /utils/whatsapp.js

// import twilio from "twilio";

// const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

// export async function sendWhatsApp(phone, message) {
//   return await client.messages.create({
//     from: "whatsapp:+14155238886", // Twilio Sandbox or number
//     to: `whatsapp:${phone}`,
//     body: message,
//   });
// }
