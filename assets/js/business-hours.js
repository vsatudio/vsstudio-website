(function () {
  "use strict";

  var TIME_ZONE = "Europe/Madrid";

  var BUSINESS_HOURS = {
    regularSchedule: [
      {
        label: "Lunes a viernes",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "10:00",
        closes: "20:00",
        closed: false
      },
      {
        label: "Sábado",
        days: ["Saturday"],
        opens: "10:00",
        closes: "14:00",
        closed: false
      },
      {
        label: "Domingo",
        days: ["Sunday"],
        closed: true
      }
    ],

    // Añadir aquí futuros periodos de vacaciones o aperturas especiales.
    // Mantener la lista vacía hasta conocer las fechas y horarios definitivos.
    temporaryPeriods: [
      /*
      {
        active: true,
        startDate: "YYYY-MM-DD",
        endDate: "YYYY-MM-DD",
        title: "Horario especial de vacaciones",
        schedule: [
          { label: "Lunes", days: ["Monday"], opens: "HH:MM", closes: "HH:MM", closed: false },
          { label: "Martes", days: ["Tuesday"], closed: true }
          // Añadir el resto de días de esa semana.
        ]
      }
      */
    ]
  };

  function getMadridDate() {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    var values = {};
    parts.forEach(function (part) {
      if (part.type !== "literal") values[part.type] = part.value;
    });

    return values.year + "-" + values.month + "-" + values.day;
  }

  function getActivePeriod(date) {
    return BUSINESS_HOURS.temporaryPeriods.find(function (period) {
      return period.active !== false &&
        period.startDate &&
        period.endDate &&
        Array.isArray(period.schedule) &&
        date >= period.startDate &&
        date <= period.endDate;
    }) || null;
  }

  function formatDate(date) {
    var parts = date.split("-");
    if (parts.length !== 3) return date;
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function formatHours(day) {
    return day.closed ? "Cerrado" : day.opens + "–" + day.closes;
  }

  function renderTables(schedule, activePeriod) {
    document.querySelectorAll("[data-business-hours]").forEach(function (table) {
      var tbody = table.querySelector("[data-business-hours-rows]");
      if (!tbody) return;

      var fragment = document.createDocumentFragment();
      schedule.forEach(function (day) {
        var row = document.createElement("tr");
        var heading = document.createElement("th");
        var value = document.createElement("td");

        heading.scope = "row";
        heading.textContent = day.label;
        value.textContent = formatHours(day);
        row.appendChild(heading);
        row.appendChild(value);
        fragment.appendChild(row);
      });

      tbody.replaceChildren(fragment);
    });

    document.querySelectorAll("[data-business-hours-notice]").forEach(function (notice) {
      if (!activePeriod) {
        notice.hidden = true;
        notice.textContent = "";
        return;
      }

      var dateRange = "Horario especial del " + formatDate(activePeriod.startDate) +
        " al " + formatDate(activePeriod.endDate);
      notice.textContent = activePeriod.title ? activePeriod.title + ". " + dateRange : dateRange;
      notice.hidden = false;
    });
  }

  function toOpeningHours(schedule) {
    return schedule.filter(function (day) {
      return !day.closed;
    }).map(function (day) {
      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: day.days.length === 1 ? day.days[0] : day.days,
        opens: day.opens,
        closes: day.closes
      };
    });
  }

  function toSpecialOpeningHours(schedule, period) {
    return schedule.map(function (day) {
      var specification = {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: day.days.length === 1 ? day.days[0] : day.days,
        validFrom: period.startDate,
        validThrough: period.endDate
      };

      if (day.closed) {
        specification.opens = "00:00";
        specification.closes = "00:00";
      } else {
        specification.opens = day.opens;
        specification.closes = day.closes;
      }

      return specification;
    });
  }

  function updateStructuredData(activePeriod) {
    document.querySelectorAll("script[data-business-hours-jsonld]").forEach(function (element) {
      try {
        var data = JSON.parse(element.textContent);
        data.openingHoursSpecification = toOpeningHours(BUSINESS_HOURS.regularSchedule);

        if (activePeriod) {
          data.specialOpeningHoursSpecification = toSpecialOpeningHours(activePeriod.schedule, activePeriod);
        } else {
          delete data.specialOpeningHoursSpecification;
        }

        element.textContent = JSON.stringify(data);
      } catch (error) {
        // El JSON-LD de respaldo permanece intacto si no puede procesarse.
      }
    });
  }

  function initializeBusinessHours() {
    var activePeriod = getActivePeriod(getMadridDate());
    var schedule = activePeriod ? activePeriod.schedule : BUSINESS_HOURS.regularSchedule;

    renderTables(schedule, activePeriod);
    updateStructuredData(activePeriod);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeBusinessHours, { once: true });
  } else {
    initializeBusinessHours();
  }
})();
