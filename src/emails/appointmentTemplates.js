// src/emails/appointmentTemplates.js
import { formatDateTime } from "../utils/datetime.js";
import { commonStyles, confirmationStyles } from "./emailStyles.js";

const currency = (n = 0) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    n
  );

const baseWrapper = (inner, styleType = "confirmation") => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notificación de Cita</title>
    <style>
      ${commonStyles}
      ${styleType === "confirmation" ? confirmationStyles : ""}
      .appointment-card {
        background: #f8fafc;
        border-radius: 12px;
        padding: 24px;
        margin: 24px 0;
        border: 1px solid #e2e8f0;
      }
      .appointment-details {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        margin-bottom: 20px;
      }
      .detail-item {
        flex: 1;
        min-width: 200px;
      }
      .detail-label {
        font-size: 14px;
        color: #64748b;
        margin-bottom: 6px;
      }
      .detail-value {
        font-size: 18px;
        font-weight: 600;
        color: #1e293b;
      }
      .services-container {
        margin: 20px 0;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
      }
.services-container {
  margin: 20px 0;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

/* Cabecera en dos columnas */
.services-header {
  display: table;
  width: 100%;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  font-weight: 600;
}
.services-header .cell-name,
.services-header .cell-price {
  display: table-cell;
  padding: 14px 20px;
  vertical-align: middle;
}
.services-header .cell-name { width: 60%; }
.services-header .cell-price { width: 40%; text-align: right; }

/* Tabla de filas */
.services-table {
  width: 100%;
  border-collapse: collapse;
}
.services-table .cell-name,
.services-table .cell-price {
  padding: 12px 20px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}
.services-table .cell-name { width: 60%; color: #1e293b; }
.services-table .cell-price { width: 40%; text-align: right; white-space: nowrap; color: #1e293b; }
.services-table tr:last-child .cell-name,
.services-table tr:last-child .cell-price { border-bottom: none; }

      .service-item {
        display: flex;
        justify-content: space-between;
        padding: 12px 20px;
        border-bottom: 1px solid #f1f5f9;
      }
      .service-item:last-child {
        border-bottom: none;
      }
      .status-badge {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 600;
      }
      .notes-container {
        margin-top: 20px;
      }
      .notes-label {
        font-size: 14px;
        color: #64748b;
        margin-bottom: 6px;
      }
      .notes-content {
        background: white;
        border-radius: 8px;
        padding: 14px;
        border: 1px solid #e2e8f0;
        font-size: 15px;
        line-height: 1.5;
        color: #334155;
      }
      .brand-header {
        text-align: center;
        padding: 20px 0;
        background: linear-gradient(135deg, #4361ee, #3a0ca3);
        color: white;
      }
      .brand-name {
        font-size: 24px;
        font-weight: 700;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="brand-header">
        <h1 class="brand-name">${inner.brandName || "Salón Belleza"}</h1>
      </div>
      <div class="content">
        ${inner.content}
      </div>
      <div class="footer">
        <p>Si no esperabas este correo, puedes ignorarlo.</p>
        <p class="app-name">© ${new Date().getFullYear()} ${
  inner.brandName || "Salón Belleza"
}</p>
      </div>
    </div>
  </body>
  </html>
`;

const servicesList = (services = []) => {
  if (!services.length) return "";

  const rows = services
    .map(
      (s) => `
        <tr class="service-row">
          <td class="cell-name">${s.name}</td>
          <td class="cell-price"><strong>${currency(s.price)}</strong> (${
        s.duration
      } min)</td>
        </tr>`
    )
    .join("");

  return `
    <div class="services-container">
      <div class="services-header">
        <span class="cell-name">Servicio</span>
        <span class="cell-price">Precio</span>
      </div>
      <table class="services-table" role="presentation" cellpadding="0" cellspacing="0">
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

const headerSection = (title, iconColor, iconSvg) => `
  <div class="header">
    <h1>${title}</h1>
  </div>
`;

const infoCard = (content) => `
  <div class="appointment-card">
    ${content}
  </div>
`;

const ctaButton = (url, text) => `
  <div class="button-container">
    <a href="${url}" class="button" 
       style="display:inline-block; background:#2563eb; color:#ffffff; 
              padding:12px 20px; border-radius:6px; 
              text-decoration:none; font-weight:bold; font-size:14px;">
      ${text}
    </a>
  </div>
`;

const notesSection = (notes) =>
  notes
    ? `
  <div class="notes-container">
    <div class="notes-label">Notas</div>
    <div class="notes-content">${notes}</div>
  </div>
`
    : "";

// -- Plantillas (no contienen defaults de marca; siempre usan brand.name) --
export const appointmentTemplates = {
  created: ({ name, when, services, total, notes, brand, ctaUrl }) => {
    const innerContent = `
      ${headerSection(
        "¡Cita creada!",
        "#eff6ff",
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>`
      )}
      <div class="greeting">Hola ${name},</div>
      <div class="message">
        Tu cita en <strong>${brand.name}</strong> ha sido creada correctamente.
      </div>
      
      ${infoCard(`
        <div class="appointment-details">
          <div class="detail-item">
            <div class="detail-label">Fecha y hora</div>
            <div class="detail-value">${when}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Total</div>
            <div class="detail-value">${currency(total)}</div>
          </div>
        </div>
        
        ${servicesList(services)}
        
        ${notesSection(notes)}
      `)}
      
      ${ctaUrl ? ctaButton(ctaUrl, "Ver detalles de mi cita") : ""}
      
      <div class="note">
        <p>Recibirás un recordatorio 24 horas antes de tu cita.</p>
      </div>
    `;

    return baseWrapper(
      { content: innerContent, brandName: brand.name },
      "confirmation"
    );
  },

  updated: ({ name, when, services, total, notes, brand, ctaUrl }) => {
    const innerContent = `
      ${headerSection(
        "Tu cita fue actualizada",
        "#f0fdfa",
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
          <polyline points="16 6 12 2 8 6"></polyline>
          <line x1="12" y1="2" x2="12" y2="15"></line>
        </svg>`
      )}
      <div class="greeting">Hola ${name},</div>
      <div class="message">
        Hemos actualizado los detalles de tu cita en <strong>${
          brand.name
        }</strong>.
      </div>
      
      ${infoCard(`
        <div class="appointment-details">
          <div class="detail-item">
            <div class="detail-label">Nueva fecha y hora</div>
            <div class="detail-value">${when}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Total</div>
            <div class="detail-value">${currency(total)}</div>
          </div>
        </div>
        
        ${servicesList(services)}
        
        ${notesSection(notes)}
      `)}
      
      ${ctaUrl ? ctaButton(ctaUrl, "Ver detalles de mi cita") : ""}
    `;

    return baseWrapper(
      { content: innerContent, brandName: brand.name },
      "confirmation"
    );
  },

  cancelled: ({ name, when, brand }) => {
    const innerContent = `
      ${headerSection(
        "Cita cancelada",
        "#fffbeb",
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>`
      )}
      <div class="greeting">Hola ${name},</div>
      <div class="message">
        Tu cita en <strong>${brand.name}</strong> programada para 
        <strong>${when}</strong> ha sido <strong style="color: #dc2626;">cancelada</strong>.
      </div>
      
      ${infoCard(`
        <div style="text-align: center; padding: 20px;">
          <div class="detail-label">Fecha original</div>
          <div class="detail-value">${when}</div>
        </div>
      `)}
      
      <div class="message">
        Si necesitas reprogramar tu cita, por favor pulsa reactivar en tus citas programadas o contáctanos directamente.
      </div>
      
      <div class="button-container">
        <a href="#" class="button">Programar nueva cita</a>
      </div>
    `;

    return baseWrapper({ content: innerContent, brandName: brand.name });
  },

  deleted: ({ name, when, brand }) => {
    const innerContent = `
      ${headerSection(
        "Cita eliminada",
        "#fef2f2",
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>`
      )}
      <div class="greeting">Hola ${name},</div>
      <div class="message">
        Se ha eliminado la cita en <strong>${brand.name}</strong> 
        que estaba programada para <strong>${when}</strong>.
      </div>
      
      ${infoCard(`
        <div style="text-align: center; padding: 20px;">
          <div class="detail-label">Fecha eliminada</div>
          <div class="detail-value">${when}</div>
        </div>
      `)}
      
      <div class="message">
        Si esto fue un error o deseas programar una nueva cita, por favor genera una nueva cita o contáctanos.
      </div>
      
      <div class="button-container">
        <a href="#" class="button">Programar nueva cita</a>
      </div>
    `;

    return baseWrapper({ content: innerContent, brandName: brand.name });
  },

  reactivated: ({ name, when, brand }) => {
    const innerContent = `
      ${headerSection(
        "Cita reactivada",
        "#eff6ff",
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
          <path d="M14.752 11.168l-3.197-2.132A1 1 0 0 0 10 9.87v4.263a1 1 0 0 0 1.555.832l3.197-2.132a1 1 0 0 0 0-1.664z"></path>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>`
      )}
      <div class="greeting">Hola ${name},</div>
      <div class="message">
        Tu cita en <strong>${brand.name}</strong> ha sido reactivada con éxito.
      </div>
      
      ${infoCard(`
        <div class="appointment-details">
          <div class="detail-item">
            <div class="detail-label">Fecha y hora</div>
            <div class="detail-value">${when}</div>
          </div>
          <div class="detail-item" style="text-align: center;">
            <div class="status-badge" style="background: #dcfce7; color: #166534;">
              Reactivada
            </div>
          </div>
        </div>
      `)}
      
      <div class="message">
        Estamos encantados de volver a tenerte con nosotros. ¡Te esperamos!
      </div>
    `;

    return baseWrapper(
      { content: innerContent, brandName: brand.name },
      "confirmation"
    );
  },

  completed: ({ name, when, brand }) => {
    const innerContent = `
      ${headerSection(
        "Cita completada",
        "#f0fdf4",
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>`
      )}
      <div class="greeting">¡Gracias ${name}!</div>
      <div class="message">
        Tu cita en <strong>${
          brand.name
        }</strong> del <strong>${when}</strong> ha sido completada con éxito.
      </div>
      
      ${infoCard(`
        <div style="text-align: center; padding: 20px;">
          <div class="detail-label">Fecha de la cita</div>
          <div class="detail-value">${when}</div>
        </div>
      `)}
      
      <div class="message">
        Esperamos verte de nuevo pronto. ¡Gracias por confiar en nosotros!
      </div>
      
      <div class="code-container">
        <p style="margin: 0; font-size: 15px; color: #475569;">
          ¿Cómo fue tu experiencia?<br>
          <a href="#" style="color: #3b82f6; text-decoration: none; font-weight: 600;">
            Comparte tu opinión
          </a>
        </p>
      </div>
    `;

    return baseWrapper(
      { content: innerContent, brandName: brand.name },
      "confirmation"
    );
  },
};

/**
 * buildTemplateData
 * - Recibe brand centralizada (sin defaults aquí)
 * - Formatea "when" con la tz de brand
 */
export const buildTemplateData = ({
  type,
  user,
  appointment,
  services = [],
  brand,
}) => {
  // -- fecha/hora con la tz de la marca --
  const when = formatDateTime(appointment.date, brand.timezone);

  // URL CTA desde la config de marca (si existe)
  const ctaUrl = brand.frontendUrl
    ? `${brand.frontendUrl}/appointments/my-appointments`
    : "";

  // Total: usa appointment.totalPrice o suma services
  const total =
    appointment.totalPrice ??
    services.reduce((acc, s) => acc + (s.price || 0), 0);

  const base = {
    name: user?.name || "cliente",
    when,
    services,
    total,
    notes: appointment?.notes || "",
    brand,
    ctaUrl,
  };

  return appointmentTemplates[type](base);
};
