import { createContext, useState, type ReactNode } from "react";
import type { User, UserStorage } from "../types/user";

export interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  putUser: (data: UserStorage) => void;
  deleteUser: () => void;
}

interface UserProviderProps {
  children: ReactNode;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  putUser: () => {},
  deleteUser: () => {},
});

export function UserProvider({ children }: UserProviderProps) {
  const lsUser = localStorage.getItem("user")
    ? (JSON.parse(localStorage.getItem("user") as string) as UserStorage | null)
    : null;

  const [user, setUser] = useState<User | null>(lsUser?.user || null);

  function putUser(data: UserStorage) {
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data));
  }

  function deleteUser(): void {
    setUser(null);
    localStorage.removeItem("user");
  }

  return (
    <UserContext.Provider value={{ user, setUser, putUser, deleteUser }}>
      {children}
    </UserContext.Provider>
  );
}
export default UserContext;
