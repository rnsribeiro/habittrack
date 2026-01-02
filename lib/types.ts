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
