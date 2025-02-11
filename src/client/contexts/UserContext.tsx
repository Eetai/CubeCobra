import React, { createContext, useMemo } from 'react';

import User from '../../datatypes/user';

const UserContext = createContext<User | null>(null);

export const UserProvider: React.FC<{ user: User | null; children: React.ReactNode }> = ({ user, children }) => {
  const enhancedUser = useMemo(() => {
    if (!user) return user;
    if (process.env.NODE_ENV === 'production') return user;

    // Add patron role in development
    return {
      ...user,
      roles: [...(user.roles || []), 'Patron']
    };
  }, [user]);

  return <UserContext.Provider value={enhancedUser}>{children}</UserContext.Provider>;
};

export default UserContext;
