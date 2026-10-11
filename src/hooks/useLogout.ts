import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import useToken from "./useToken";
import useUser from "./useUser";

/**
 * Encerra a sessão: limpa os dois contexts de auth (e o localStorage deles) e o cache do
 * React Query — sem isso, o próximo usuário a logar nesta aba veria dados do anterior
 * enquanto as queries revalidam.
 */
export default function useLogout(): () => void {
  const { logout } = useToken();
  const { deleteUser } = useUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useCallback(() => {
    logout();
    deleteUser();
    queryClient.clear();
    navigate("/", { replace: true });
  }, [logout, deleteUser, queryClient, navigate]);
}
