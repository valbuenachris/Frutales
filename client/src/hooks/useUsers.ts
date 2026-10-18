import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { AUTH_QUERY_KEY } from '../auth/AuthProvider';
import type { User, UserCreateInput, UserUpdateInput } from '../types/auth';

const usersKey = ['users'] as const;

export function useUsers() {
  return useQuery({ queryKey: usersKey, queryFn: usersApi.list });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UserCreateInput) => usersApi.create(input),
    onSuccess: (user) => {
      queryClient.setQueryData<User[]>(usersKey, (current) =>
        current ? [...current, user].sort((a, b) => a.name.localeCompare(b.name)) : [user],
      );
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UserUpdateInput }) =>
      usersApi.update(id, input),
    onSuccess: (user) => {
      queryClient.setQueryData<User[]>(usersKey, (current) =>
        current?.map((item) => (item.id === user.id ? user : item)),
      );
      void queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<User[]>(usersKey, (current) =>
        current?.filter((item) => item.id !== id),
      );
    },
  });
}
