
export const loginUser = async (username: string, password: string): Promise<'admin' | 'member' | null> => {
    // Simulasi delay jaringan (1.5 detik) agar terasa seperti menghubungi server aman
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    const upperUser = username.toUpperCase();

    // Admin Login
    if (upperUser === 'A' && password === '') {
      return 'admin';
    }
    
    // Magic Login (Member Email Only Bypass) & Password 'B' check
    const magicUsers = ['EMMA@HUB.COM', 'ALEX@HUB.COM', 'SARAH@HUB.COM', 'DAVID@HUB.COM'];
    if (magicUsers.includes(upperUser)) {
        // Allow login if password is empty (Magic Login) OR if password is 'B'
        if (password === '' || password === 'B') {
            return 'member';
        }
    }

    // Default Demo Login
    if (upperUser === 'A' && password === 'A') {
      return 'member';
    } 
    
    return null;
};