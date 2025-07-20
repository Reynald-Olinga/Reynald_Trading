const JWT_KEY = 'jwt';
const USERNAME_KEY = 'username';

function getUsername(): string | null {
    return localStorage.getItem('username');
}

function getToken(): string | null {
    return localStorage.getItem(JWT_KEY);
}

function isAuthenticated(): boolean {
    return getToken() !== null && getUsername() !== null;
}

// Dans tokens.service.ts
function setTokenAndUsername(token: string, username: string): void {
  console.log("Storing token:", token); // Ajoutez ce log
  localStorage.setItem("jwt", token);
  localStorage.setItem("username", username);
}

function setToken(token: string): void {
    localStorage.setItem(JWT_KEY, token);
}

function clearToken(): void {
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(USERNAME_KEY);
}

export default {
    getUsername,
    getToken,
    isAuthenticated,
    setTokenAndUsername,
    setToken, // Nouvelle fonction ajoutée
    clearToken,
};

