// src/emails/emailStyles.js
export const commonStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  body {
    background-color: #f5f7fa;
    padding: 20px 0;
  }
  
  .container {
    max-width: 600px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid #e0e6ed;
  }
  
  .header {
    padding: 30px 0;
    text-align: center;
  }
  
  .header h1 {
    color: white;
    font-size: 26px;
    font-weight: 600;
    margin: 0;
  }
  
  .content {
    padding: 40px;
  }
  
  .greeting {
    color: #1e293b;
    font-size: 20px;
    margin-bottom: 20px;
  }
  
  .message {
    color: #475569;
    line-height: 1.6;
    margin-bottom: 30px;
    font-size: 16px;
  }
  
  .code-container {
    background: #f1f5f9;
    border-radius: 10px;
    padding: 25px;
    text-align: center;
    margin: 30px 0;
    border: 1px dashed #cbd5e1;
  }
  
  .code {
    font-size: 32px;
    letter-spacing: 4px;
    font-weight: 700;
    font-family: monospace;
  }
  
  .button-container {
    text-align: center;
    margin: 35px 0;
    color:#ffffff
  }
  
  .button {
    display: inline-block;
    color: white;
    text-decoration: none;
    padding: 16px 40px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
  }
  
  .button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.2);
  }
  
  .note {
    background: #f8fafc;
    border-left: 4px solid #94a3b8;
    padding: 15px;
    margin-top: 30px;
    color: #64748b;
    font-size: 14px;
    border-radius: 0 8px 8px 0;
  }
  
  .footer {
    background: #f8fafc;
    padding: 25px;
    text-align: center;
    border-top: 1px solid #e2e8f0;
    color: #64748b;
    font-size: 14px;
  }
  
  .app-name {
    font-weight: 600;
  }
  
  @media only screen and (max-width: 620px) {
    .content {
      padding: 30px 25px;
    }
    
    .header {
      padding: 25px 0;
    }
    
    .header h1 {
      font-size: 22px;
    }
    
    .greeting {
      font-size: 18px;
    }
    
    .code {
      font-size: 26px;
      letter-spacing: 3px;
    }
    
    .button {
      width: 100%;
      padding: 14px;
      text-align: center;
    }
  }
`;

export const confirmationStyles = `
  .header {
    background: linear-gradient(135deg, #4361ee, #3a0ca3);
  }
  
  .code {
    color: #3a0ca3;
  }
  
  .button {
    background: linear-gradient(135deg, #4361ee, #3a0ca3);
  }
  
  .app-name {
    color: #3a0ca3;
  }
`;

export const resetStyles = `
  .header {
    background: linear-gradient(135deg, #ef476f, #d90429);
  }
  
  .code {
    color: #d90429;
  }
  
  .button {
    background: linear-gradient(135deg, #ef476f, #d90429);
  }
  
  .app-name {
    color: #d90429;
  }
`;
