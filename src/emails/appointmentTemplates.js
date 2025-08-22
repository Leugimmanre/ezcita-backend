// src/emails/appointmentTemplates.js
import { formatDateTime } from "../utils/datetime.js";
import { commonStyles, confirmationStyles } from "./emailStyles.js";

const currency = (n = 0) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    n
  );

const baseWrapper = (inner, styleType = "confirmation") => `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lista de Servicios Mejorada</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }
        
        .container {
            max-width: 650px;
            width: 100%;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            padding: 30px;
            border: 1px solid #e2e8f0;
        }
        
        h1 {
            text-align: center;
            color: #1e40af;
            margin-bottom: 25px;
            font-weight: 700;
            font-size: 28px;
        }
        
        .services-container {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            margin: 25px 0;
            background: white;
        }
        
        .services-header {
            display: flex;
            justify-content: space-between;
            padding: 16px 20px;
            background: #f1f5f9;
            font-weight: 600;
            color: #334155;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .services-header span {
            flex: 1;
        }
        
        .service-name {
            text-align: left;
        }
        
        .service-price {
            text-align: right;
        }
        
        .service-item {
            display: flex;
            justify-content: space-between;
            padding: 14px 20px;
            border-bottom: 1px solid #f1f5f9;
            align-items: center;
        }
        
        .service-item:last-child {
            border-bottom: none;
        }
        
        .service-item span {
            flex: 1;
        }
        
        .item-name {
            text-align: left;
            color: #334155;
        }
        
        .item-price {
            text-align: right;
            color: #1e40af;
            font-weight: 600;
        }
        
        .total-container {
            display: flex;
            justify-content: space-between;
            padding: 18px 20px;
            background: #f8fafc;
            font-weight: 700;
            font-size: 18px;
            border-top: 2px dashed #e2e8f0;
            color: #1e293b;
        }
        
        .preview-note {
            text-align: center;
            color: #64748b;
            font-style: italic;
            margin-top: 30px;
            padding: 15px;
            background: #f1f5f9;
            border-radius: 8px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Lista de Servicios Mejorada</h1>
        
        <div class="services-container">
            <div class="services-header">
                <span class="service-name">Servicio</span>
                <span class="service-price">Precio</span>
            </div>
            
            <div class="service-item">
                <span class="item-name">Manicura Básica</span>
                <span class="item-price">20,00 € (30 min)</span>
            </div>
            
            <div class="service-item">
                <span class="item-name">Pedicura Spa</span>
                <span class="item-price">35,00 € (45 min)</span>
            </div>
            
            <div class="service-item">
                <span class="item-name">Tratamiento Facial Completo</span>
                <span class="item-price">60,00 € (60 min)</span>
            </div>
            
            <div class="service-item">
                <span class="item-name">Masaje Relajante</span>
                <span class="item-price">50,00 € (50 min)</span>
            </div>
            
            <div class="total-container">
                <span>Total:</span>
                <span>165,00 €</span>
            </div>
        </div>
        
        <div class="preview-note">
            Esta es una vista previa de cómo se verá la lista de servicios después de las mejoras.
        </div>
    </div>

    <!-- Aquí iría la implementación de la función servicesList si fuera necesario en el frontend.
         En el backend, esta función debe ser implementada en JavaScript, no dentro del HTML. -->
</body>
</html>
`;

const servicesList = (services = []) => {
  if (!services.length) return "";

  const items = services
    .map(
      (s) => `
    <div class="service-item">
      <span class="item-name">${s.name}</span>
      <span class="item-price"><strong>${currency(s.price)}</strong> (${
        s.duration
      } min)</span>
    </div>
  `
    )
    .join("");

  const total = services.reduce((sum, service) => sum + service.price, 0);

  return `
    <div class="services-container">
      <div class="services-header">
        <span class="service-name">Servicio</span>
        <span class="service-price">Precio</span>
      </div>
      ${items}
      <div class="total-container">
        <span>Total:</span>
        <span>${currency(total)}</span>
      </div>
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
    <a href="${url}" class="button">${text}</a>
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
