const fs = require("fs");

const ICS_URL = "https://calendar.google.com/calendar/ical/reggmyster%40gmail.com/private-98c5d3a6db4b47b17c7a083cc465a659/basic.ics";

function parseDate(value) {
  const datePart = value.substring(0,8);
  return new Date(
    parseInt(datePart.substring(0,4)),
    parseInt(datePart.substring(4,6)) - 1,
    parseInt(datePart.substring(6,8))
  );
}

function unfoldICS(text) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function adjustEndDate(start, endRaw) {
  if (!endRaw) return start;
  const end = parseDate(endRaw);
  if (end > start) end.setDate(end.getDate() - 1);
  return end;
}

function getNextYearlyOccurrence(originalDate) {
  const now = new Date();
  let next = new Date(now.getFullYear(), originalDate.getMonth(), originalDate.getDate());

  if (next < now) {
    next = new Date(now.getFullYear() + 1, originalDate.getMonth(), originalDate.getDate());
  }

  return next;
}

function parseCalendar(icsText) {

  const items = [];
  const data = unfoldICS(icsText);
  const blocks = data.split("BEGIN:VEVENT");

  blocks.forEach(block => {

    const summaryMatch = block.match(/SUMMARY:(.+)/);
    const startMatch = block.match(/DTSTART[^:]*:(.+)/);
    const endMatch = block.match(/DTEND[^:]*:(.+)/);
    const rruleMatch = block.match(/RRULE:(.+)/);

    if (!summaryMatch || !startMatch) return;

    const rawTitle = summaryMatch[1].trim();
    const lower = rawTitle.toLowerCase();

    let type = null;

    if (lower.includes("trip")) type = "trip";
    if (lower.includes("event")) type = "event";

    if (!type) return;

    const originalStart = parseDate(startMatch[1]);

    let startDate = originalStart;
    let endDate;

    if (rruleMatch && rruleMatch[1].includes("FREQ=YEARLY")) {

      startDate = getNextYearlyOccurrence(originalStart);
      endDate = startDate;

    } else {

      endDate = adjustEndDate(startDate, endMatch ? endMatch[1] : null);

    }

    items.push({
      type,
      title: rawTitle.replace(/trip|event/i,"").trim(),
      start,
      end:endDate
    });

  });

  return items;

}

async function run() {

  const calRes = await fetch(ICS_URL);
  const calText = await calRes.text();

  const calendarItems = parseCalendar(calText);

  const year = new Date().getFullYear();

  const holidayRes = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IE`);
  const holidays = await holidayRes.json();

  const data = {
    generated: new Date(),
    calendarItems,
    holidays
  };

  fs.writeFileSync("schedule.json", JSON.stringify(data,null,2));

}

run();
