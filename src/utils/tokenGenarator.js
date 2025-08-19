// src/utils/tokenGenarator.js
export const tokenGenarator = () => {
  return Date.now().toString(32) + Math.random().toString(32).slice(2);
};

export default tokenGenarator;
