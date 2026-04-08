"use client";

import { useEffect, useMemo, useState } from "react";
import { HabitForm } from "@/components/habits/HabitForm";
import { useI18n } from "@/lib/i18n";
import { intlLocale } from "@/lib/locale";
import type { Habit, ManagedUser } from "@/lib/types";
import { apiFetch } from "@/src/lib/api";
import { useRequireSession } from "@/src/lib/useRequireSession";

type AdminUsersResponse = {
  enabled: boolean;
  canManage: boolean;
  isAdmin: boolean;
  reason?: string;
  users: ManagedUser[];
};

function formatDateTime(value: string | null, locale: "pt" | "en") {
  if (!value) return locale === "en" ? "Never" : "Nunca";
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatDateOnly(value: string, locale: "pt" | "en") {
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" }).format(new Date(value));
}

export default function HabitsManagePage() {
  const { ready } = useRequireSession("/login");
  const { locale } = useI18n();

  const copy =
    locale === "en"
      ? {
          loading: "Loading...",
          title: "Manage",
          subtitle: "Keep habits updated and, when admin access is configured, review the accounts using the app.",
          habitTitle: "Habits",
          habitSubtitlePrefix: "Create and edit habits here. The current month view",
          habitSubtitleSuffix: "is available in Habits.",
          listTitle: "Your habits",
          empty: "No habits created yet.",
          currentColor: "Current color",
          delete: "Delete",
          hint: "Tip: title edits are saved when the field loses focus.",
          colorTitle: "Habit color",
          usersKicker: "Users",
          usersTitle: "Accounts and access",
          usersSubtitle: "See who is using the system, when they last signed in, and moderate access when admin tools are enabled.",
          usersLoading: "Loading users...",
          usersEmpty: "No users found.",
          usersName: "Name",
          usersEmail: "Email",
          usersLastAccess: "Last access",
          usersCreatedAt: "Created",
          you: "You",
          blocked: "Blocked",
          active: "Active",
          block: "Block",
          unblock: "Unblock",
          deleteUser: "Delete user",
          deleteWarning: "Deleting a user also removes habits, tasks, books, and reading history. Continue?",
          adminMissing: "User management needs SUPABASE_SERVICE_ROLE_KEY configured in the environment.",
          adminForbidden: "This account does not have admin permission yet. Add your email to ADMIN_EMAILS or set app_metadata.role = admin.",
          errors: {
            load: "Could not load habits.",
            update: "Could not update the habit.",
            delete: "Could not delete the habit.",
            users: "Could not load users.",
            block: "Could not change the user status.",
            removeUser: "Could not delete the user.",
          },
        }
      : {
          loading: "Carregando...",
          title: "Gerenciar",
          subtitle: "Mantenha os habitos atualizados e, quando o acesso admin estiver configurado, acompanhe as contas que usam o app.",
          habitTitle: "Habitos",
          habitSubtitlePrefix: "Crie e edite habitos aqui. A visualizacao do mes atual",
          habitSubtitleSuffix: "fica em Habitos.",
          listTitle: "Seus habitos",
          empty: "Nenhum habito cadastrado.",
          currentColor: "Cor atual",
          delete: "Excluir",
          hint: "Dica: editar o titulo acontece ao sair do campo.",
          colorTitle: "Cor do habito",
          usersKicker: "Usuarios",
          usersTitle: "Contas e acesso",
          usersSubtitle: "Veja quem esta usando o sistema, quando foi o ultimo acesso e modere o acesso quando as ferramentas admin estiverem habilitadas.",
          usersLoading: "Carregando usuarios...",
          usersEmpty: "Nenhum usuario encontrado.",
          usersName: "Nome",
          usersEmail: "E-mail",
          usersLastAccess: "Ultimo acesso",
          usersCreatedAt: "Criado em",
          you: "Voce",
          blocked: "Bloqueado",
          active: "Ativo",
          block: "Bloquear",
          unblock: "Desbloquear",
          deleteUser: "Excluir usuario",
          deleteWarning: "Excluir um usuario tambem remove habitos, tarefas, livros e historico de leitura dele. Deseja continuar?",
          adminMissing: "O gerenciamento de usuarios precisa da SUPABASE_SERVICE_ROLE_KEY configurada no ambiente.",
          adminForbidden: "Esta conta ainda nao tem permissao de admin. Adicione seu e-mail em ADMIN_EMAILS ou defina app_metadata.role = admin.",
          errors: {
            load: "Erro ao carregar habitos.",
            update: "Erro ao atualizar.",
            delete: "Erro ao excluir.",
            users: "Erro ao carregar usuarios.",
            block: "Erro ao alterar o status do usuario.",
            removeUser: "Erro ao excluir o usuario.",
          },
        };

  const [habits, setHabits] = useState<Habit[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [adminUsers, setAdminUsers] = useState<ManagedUser[]>([]);
  const [adminEnabled, setAdminEnabled] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminResolved, setAdminResolved] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersMessage, setUsersMessage] = useState<string | null>(null);
  const [userActionId, setUserActionId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );
  }, [locale, now]);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      setErrorMsg(null);
      try {
        const { habits: loadedHabits } = await apiFetch("/api/habits");
        setHabits(loadedHabits);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : copy.errors.load;
        setErrorMsg(message);
      }
    })();

    (async () => {
      setUsersLoading(true);
      setUsersMessage(null);
      try {
        const response = (await apiFetch("/api/admin/users")) as AdminUsersResponse;
        setAdminEnabled(response.enabled);
        setIsAdminUser(response.isAdmin);
        setCanManageUsers(response.canManage);
        setAdminUsers(response.users ?? []);

        if (response.isAdmin && !response.enabled) {
          setUsersMessage(copy.adminMissing);
        } else if (response.isAdmin && !response.canManage) {
          setUsersMessage(copy.adminForbidden);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : copy.errors.users;
        setUsersMessage(message);
      } finally {
        setUsersLoading(false);
        setAdminResolved(true);
      }
    })();
  }, [copy.adminForbidden, copy.adminMissing, copy.errors.load, copy.errors.users, ready]);

  async function createHabit(payload: { title: string; color: string }) {
    setErrorMsg(null);
    const { habit } = await apiFetch("/api/habits", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHabits((current) => [...current, habit]);
  }

  async function updateHabit(id: string, patch: Partial<Pick<Habit, "title" | "color">>) {
    setErrorMsg(null);
    setBusyId(id);
    try {
      const { habit } = await apiFetch(`/api/habits/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setHabits((list) => list.map((item) => (item.id === id ? habit : item)));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.errors.update;
      setErrorMsg(message);
    } finally {
      setBusyId(null);
    }
  }

  async function deleteHabit(id: string) {
    setErrorMsg(null);
    setBusyId(id);
    try {
      await apiFetch(`/api/habits/${id}`, { method: "DELETE" });
      setHabits((list) => list.filter((item) => item.id !== id));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.errors.delete;
      setErrorMsg(message);
    } finally {
      setBusyId(null);
    }
  }

  async function updateUserAction(userId: string, action: "block" | "unblock") {
    setUsersMessage(null);
    setUserActionId(userId);
    try {
      const response = await apiFetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });

      setAdminUsers((current) => current.map((user) => (user.id === userId ? response.user : user)));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.errors.block;
      setUsersMessage(message);
    } finally {
      setUserActionId(null);
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm(copy.deleteWarning)) return;

    setUsersMessage(null);
    setUserActionId(userId);
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      setAdminUsers((current) => current.filter((user) => user.id !== userId));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.errors.removeUser;
      setUsersMessage(message);
    } finally {
      setUserActionId(null);
    }
  }

  if (!ready) return <div className="p-6 text-sm text-slate-300">{copy.loading}</div>;

  const showUsersSection = adminResolved && isAdminUser;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">{copy.title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">{copy.subtitle}</p>
      </div>

      <section className="space-y-4">
        <div>
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-300">{copy.habitTitle}</span>
          <p className="mt-2 text-sm text-slate-300">
            {copy.habitSubtitlePrefix} ({monthLabel}) {copy.habitSubtitleSuffix}
          </p>
        </div>

        <div id="new-habit">
          <HabitForm onCreate={createHabit} />
        </div>

        {errorMsg ? <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm">{errorMsg}</div> : null}

        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b px-4 py-3 font-medium text-slate-900">{copy.listTitle}</div>

          {habits.length === 0 ? (
            <div className="p-4 text-sm text-zinc-600">{copy.empty}</div>
          ) : (
            <ul className="divide-y">
              {habits.map((habit) => (
                <li key={habit.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        className="w-full max-w-[420px] rounded-lg border px-2 py-1 text-sm"
                        defaultValue={habit.title}
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          if (value && value !== habit.title) updateHabit(habit.id, { title: value });
                        }}
                      />
                      <input
                        type="color"
                        className="h-9 w-14 rounded-lg border"
                        defaultValue={habit.color}
                        onChange={(event) => updateHabit(habit.id, { color: event.target.value })}
                        title={copy.colorTitle}
                      />
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {copy.currentColor}: <span style={{ color: habit.color }}>{habit.color}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={busyId === habit.id}
                      onClick={() => deleteHabit(habit.id)}
                      className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm text-red-700 disabled:opacity-60 hover:bg-red-50"
                    >
                      {copy.delete}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-slate-400">{copy.hint}</p>
      </section>

      {showUsersSection ? (
        <section className="space-y-4">
          <div>
            <span className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-300">{copy.usersKicker}</span>
            <h2 className="mt-2 text-xl font-semibold text-white">{copy.usersTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">{copy.usersSubtitle}</p>
          </div>

          {usersMessage ? <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm">{usersMessage}</div> : null}

          <div className="overflow-hidden rounded-2xl border bg-white">
            <div className="border-b px-4 py-3 font-medium text-slate-900">HabitTrack</div>

            {usersLoading ? (
              <div className="p-4 text-sm text-zinc-600">{copy.usersLoading}</div>
            ) : !adminEnabled || !canManageUsers ? (
              <div className="p-4 text-sm text-zinc-600">{usersMessage ?? copy.usersLoading}</div>
            ) : adminUsers.length === 0 ? (
              <div className="p-4 text-sm text-zinc-600">{copy.usersEmpty}</div>
            ) : (
              <div className="divide-y">
                {adminUsers.map((user) => {
                  const actionBusy = userActionId === user.id;
                  return (
                    <div key={user.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-base font-semibold text-slate-900">{user.name || "-"}</div>
                          {user.is_current_user ? (
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                              {copy.you}
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              user.is_blocked
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {user.is_blocked ? copy.blocked : copy.active}
                          </span>
                        </div>

                        <div className="mt-2 grid gap-2 text-sm text-zinc-600 md:grid-cols-3">
                          <div>
                            <span className="font-medium text-slate-700">{copy.usersEmail}: </span>
                            {user.email || "-"}
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">{copy.usersLastAccess}: </span>
                            {formatDateTime(user.last_sign_in_at, locale)}
                          </div>
                          <div>
                            <span className="font-medium text-slate-700">{copy.usersCreatedAt}: </span>
                            {formatDateOnly(user.created_at, locale)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={actionBusy || user.is_current_user}
                          onClick={() => updateUserAction(user.id, user.is_blocked ? "unblock" : "block")}
                          className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-amber-700 disabled:opacity-60 hover:bg-amber-50"
                        >
                          {user.is_blocked ? copy.unblock : copy.block}
                        </button>
                        <button
                          disabled={actionBusy || user.is_current_user}
                          onClick={() => deleteUser(user.id)}
                          className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm text-red-700 disabled:opacity-60 hover:bg-red-50"
                        >
                          {copy.deleteUser}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
