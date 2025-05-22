import { useContext } from "react";
import TokenContext, { type TokenContextType } from "../contexts/TokenContext";

export default function useToken(): TokenContextType {
  return useContext(TokenContext);
}
