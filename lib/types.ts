export type Habit = {
  id: string;
  user_id: string;
  title: string;
  color: string; // "#22c55e"
  frequency: "daily" | "weekdays" | "weekly" | "custom";
  days_of_week: number[] | null;
  start_date: string;
  end_date: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type HabitCompletionStatus = "done" | "partial" | "missed";

export type HabitCompletion = {
  id: string;
  user_id: string;
  habit_id: string;
  date: string; // "YYYY-MM-DD"
  status: HabitCompletionStatus;
  created_at: string;
};

export type TaskPriority = "low" | "medium" | "high";

export type TaskType = "due" | "scheduled" | "anytime";

export type Task = {
  id: string;
  user_id: string;

  title: string;
  notes: string | null;
  category: string | null;

  task_type: TaskType;

  due_date: string | null;       // YYYY-MM-DD
  scheduled_at: string | null;   // ISO timestamp

  priority: TaskPriority;        

  is_done: boolean;
  created_at: string;
  updated_at: string;
};

export type BookStatus = "reading" | "finished" | "abandoned";

export type Book = {
  id: string;
  user_id: string;

  title: string;
  author: string;
  cover_url: string | null;

  total_pages: number;
  current_page: number;

  status: BookStatus;
  started_at: string | null;
  finished_at: string | null;

  created_at: string;
  updated_at: string;
};

export type ReadingSession = {
  id: string;
  user_id: string;
  book_id: string;

  session_date: string; // YYYY-MM-DD
  pages_read: number;

  created_at: string;
};

