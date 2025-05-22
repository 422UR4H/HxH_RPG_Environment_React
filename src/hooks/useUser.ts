import { useContext } from "react";
import UserContext, { type UserContextType } from "../contexts/UserContext";

export default function useUser(): UserContextType {
  return useContext(UserContext);
}
