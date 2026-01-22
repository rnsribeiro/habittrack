export type Habit = {
  id: string;
  user_id: string;
  title: string;
  color: string; // "#22c55e"
  created_at: string;
};

export type HabitCompletion = {
  id: string;
  user_id: string;
  habit_id: string;
  date: string; // "YYYY-MM-DD"
  created_at: string;
};

export type TaskPriority = "low" | "medium" | "high";

export type TaskType = "due" | "scheduled" | "anytime";

export type Task = {
  id: string;
  user_id: string;

  title: string;
  notes: string | null;

  task_type: TaskType;

  due_date: string | null;       // YYYY-MM-DD
  scheduled_at: string | null;   // ISO timestamp

  priority: TaskPriority;        // ✅ novo

  is_done: boolean;
  created_at: string;
  updated_at: string;
};

