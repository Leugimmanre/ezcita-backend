import { formatDateTime } from "../utils/datetime.js";

const currency = (n = 0) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    n
  );

const baseWrapper = (inner) => `
  <div style="
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    max-width: 620px;
    margin: 0 auto;
    padding: 24px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  ">
    ${inner}
    <p style="
      color: #718096;
      font-size: 13px;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #edf2f7;
    ">
      Si no esperabas este correo, puedes ignorarlo.
    </p>
  </div>
`;

const servicesList = (services = []) => {
  if (!services.length) return "";
  const items = services
    .map(
      (s) => `
        <li style="
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        ">
          <span>${s.name}</span>
          <span><strong>${currency(s.price)}</strong> (${s.duration} min)</span>
        </li>`
    )
    .join("");
  return `
    <div style="
      margin: 16px 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        padding: 12px 16px;
        background: #f8fafc;
        font-weight: 600;
        border-bottom: 1px solid #e2e8f0;
      ">
        <span>Servicio</span>
        <span>Precio</span>
      </div>
      <ul style="list-style: none; padding: 0; margin: 0;">${items}</ul>
    </div>
  `;
};

const headerSection = (title, iconColor, iconSvg) => `
  <div style="margin-bottom: 24px;">
    <div style="
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    ">
      <div style="
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: ${iconColor};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${iconSvg}
      </div>
      <h1 style="
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: #1e293b;
      ">${title}</h1>
    </div>
`;

const infoCard = (content) => `
  <div style="
    background: #f8fafc;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 24px;
  ">
    ${content}
  </div>
`;

const ctaButton = (url, text) => `
  <div style="text-align: center; margin-top: 16px;">
    <a href="${url}" style="
      display: inline-block;
      background: #3b82f6;
      color: white;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: background-color 0.2s;
    " onMouseOver="this.style.backgroundColor='#2563eb'" 
      onMouseOut="this.style.backgroundColor='#3b82f6'">
      ${text}
    </a>
  </div>
`;

const notesSection = (notes) =>
  notes
    ? `
  <div style="margin-top: 16px;">
    <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Notas</div>
    <div style="
      background: white;
      border-radius: 6px;
      padding: 12px;
      border: 1px solid #e2e8f0;
      font-size: 15px;
      line-height: 1.5;
      color: #334155;
    ">${notes}</div>
  </div>
`
    : "";

// El padre es appointmentTemplates.js
export const appointmentTemplates = {
  created: ({ name, when, services, total, notes, brand, ctaUrl }) =>
    baseWrapper(`
      ${headerSection(
        "¡Cita creada!",
        "#eff6ff",
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>`
      )}
      <p style="
        font-size: 16px;
        line-height: 1.5;
        color: #334155;
        margin-bottom: 24px;
      ">
        Hola ${name}, tu cita en <strong style="color: #1e40af;">${brand}</strong> 
        ha sido creada correctamente.
      </p>
    </div>
    
    ${infoCard(`
      <div style="display: flex; margin-bottom: 16px;">
        <div style="flex: 1;">
          <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Fecha y hora</div>
          <div style="font-size: 18px; font-weight: 600; color: #1e293b;">${when}</div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Total</div>
          <div style="font-size: 18px; font-weight: 600; color: #1e293b;">${currency(
            total
          )}</div>
        </div>
      </div>
      
      ${servicesList(services)}
      
      ${notesSection(notes)}
    `)}
    
    ${ctaUrl ? ctaButton(ctaUrl, "Ver detalles de mi cita") : ""}
  `),

  updated: ({ name, when, services, total, notes, brand, ctaUrl }) =>
    baseWrapper(`
      ${headerSection(
        "Tu cita fue actualizada",
        "#f0fdfa",
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
          <polyline points="16 6 12 2 8 6"></polyline>
          <line x1="12" y1="2" x2="12" y2="15"></line>
        </svg>`
      )}
      <p style="
        font-size: 16px;
        line-height: 1.5;
        color: #334155;
        margin-bottom: 24px;
      ">
        Hola ${name}, hemos actualizado los detalles de tu cita en <strong style="color: #1e40af;">${brand}</strong>.
      </p>
    </div>
    
    ${infoCard(`
      <div style="display: flex; margin-bottom: 16px;">
        <div style="flex: 1;">
          <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Nueva fecha y hora</div>
          <div style="font-size: 18px; font-weight: 600; color: #1e293b;">${when}</div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Total</div>
          <div style="font-size: 18px; font-weight: 600; color: #1e293b;">${currency(
            total
          )}</div>
        </div>
      </div>
      
      ${servicesList(services)}
      
      ${notesSection(notes)}
    `)}
    
    ${ctaUrl ? ctaButton(ctaUrl, "Ver detalles de mi cita") : ""}
  `),

  cancelled: ({ name, when, brand }) =>
    baseWrapper(`
      ${headerSection(
        "Cita cancelada",
        "#fffbeb",
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>`
      )}
      <p style="
        font-size: 16px;
        line-height: 1.5;
        color: #334155;
        margin-bottom: 24px;
      ">
        Hola ${name}, tu cita en <strong style="color: #1e40af;">${brand}</strong> programada para 
        <strong>${when}</strong> ha sido <strong style="color: #dc2626;">cancelada</strong>.
      </p>
      
      ${infoCard(`
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 16px; color: #64748b; margin-bottom: 8px;">Fecha original</div>
          <div style="font-size: 18px; font-weight: 600; color: #1e293b;">${when}</div>
        </div>
      `)}
      
      <p style="
        font-size: 15px;
        line-height: 1.5;
        color: #475569;
        margin-top: 16px;
      ">
        Si necesitas reprogramar tu cita, por favor pulsa reactivar en tus citas programadas o contáctanos directamente.
      </p>
    </div>
  `),

  deleted: ({ name, when, brand }) =>
    baseWrapper(`
      ${headerSection(
        "Cita eliminada",
        "#fef2f2",
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>`
      )}
      <p style="
        font-size: 16px;
        line-height: 1.5;
        color: #334155;
        margin-bottom: 24px;
      ">
        Hola ${name}, se ha eliminado la cita en <strong style="color: #1e40af;">${brand}</strong> 
        que estaba programada para <strong>${when}</strong>.
      </p>
      
      ${infoCard(`
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 16px; color: #64748b; margin-bottom: 8px;">Fecha eliminada</div>
          <div style="font-size: 18px; font-weight: 600; color: #1e293b;">${when}</div>
        </div>
      `)}
      
      <p style="
        font-size: 15px;
        line-height: 1.5;
        color: #475569;
        margin-top: 16px;
      ">
        Si esto fue un error o deseas programar una nueva cita, por favor genera una nueva cita o contáctanos.
      </p>
    </div>
  `),

  reactivated: ({ name, when, brand }) =>
    baseWrapper(`
      ${headerSection(
        "Cita reactivada",
        "#eff6ff",
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
          <path d="M14.752 11.168l-3.197-2.132A1 1 0 0 0 10 9.87v4.263a1 1 0 0 0 1.555.832l3.197-2.132a1 1 0 0 0 0-1.664z"></path>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>`
      )}
      <p style="
        font-size: 16px;
        line-height: 1.5;
        color: #334155;
        margin-bottom: 24px;
      ">
        Hola ${name}, tu cita en <strong style="color: #1e40af;">${brand}</strong> 
        ha sido reactivada con éxito.
      </p>
      
      ${infoCard(`
        <div style="display: flex; margin-bottom: 16px;">
          <div style="flex: 1;">
            <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Fecha y hora</div>
            <div style="font-size: 18px; font-weight: 600; color: #1e293b;">${when}</div>
          </div>
          <div style="flex: 1; text-align: center;">
            <div style="
              display: inline-block;
              background: #dcfce7;
              color: #166534;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
            ">
              Reactivada
            </div>
          </div>
        </div>
      `)}
      
      <p style="
        font-size: 15px;
        line-height: 1.5;
        color: #475569;
        margin-top: 16px;
      ">
        Estamos encantados de volver a tenerte con nosotros. ¡Te esperamos!
      </p>
    </div>
  `),

  completed: ({ name, when, brand }) =>
    baseWrapper(`
      ${headerSection(
        "Cita completada",
        "#f0fdf4",
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>`
      )}
      <p style="
        font-size: 16px;
        line-height: 1.5;
        color: #334155;
        margin-bottom: 24px;
      ">
        ¡Gracias ${name}! Tu cita en <strong style="color: #1e40af;">${brand}</strong> 
        del <strong>${when}</strong> ha sido completada con éxito.
      </p>
      
      ${infoCard(`
        <div style="text-align: center; padding: 20px;">
          <div style="font-size: 16px; color: #64748b; margin-bottom: 8px;">Fecha de la cita</div>
          <div style="font-size: 18px; font-weight: 600; color: #1e293b;">${when}</div>
        </div>
      `)}
      
      <p style="
        font-size: 15px;
        line-height: 1.5;
        color: #475569;
        margin-top: 16px;
      ">
        Esperamos verte de nuevo pronto. ¡Gracias por confiar en nosotros!
      </p>
      
      <div style="
        text-align: center;
        margin-top: 24px;
        padding: 16px;
        background: #f8fafc;
        border-radius: 8px;
      ">
        <p style="margin: 0; font-size: 15px; color: #475569;">
          ¿Cómo fue tu experiencia?<br>
          <a href="#" style="color: #3b82f6; text-decoration: none; font-weight: 600;">
            Comparte tu opinión
          </a>
        </p>
      </div>
    </div>
  `),
};

export const buildTemplateData = ({
  type,
  user,
  appointment,
  services,
  settings,
}) => {
  const tz = settings?.timezone || process.env.DEFAULT_TZ || "Europe/Madrid";
  const when = formatDateTime(appointment.date, tz);
  const brand = settings?.brandName || settings?.businessName || "BarberShop";
  const ctaUrl =
    process.env.FRONTEND_URL &&
    `${process.env.FRONTEND_URL}/appointments/my-appointments`;

  const total =
    appointment.totalPrice ?? services?.reduce((s, x) => s + x.price, 0) ?? 0;

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
