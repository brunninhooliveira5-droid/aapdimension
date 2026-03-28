export interface TrainingModule {
  id: string;
  equipment_id: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingLesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  video_url: string;
  duration: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingMaterial {
  id: string;
  module_id: string | null;
  lesson_id: string | null;
  title: string;
  file_url: string;
  file_path: string | null;
  file_type: string;
  created_at: string;
}

export interface TrainingProgressRow {
  id: string;
  user_id: string;
  equipment_id: string;
  module_id: string;
  lesson_id: string;
  watched: boolean;
  watched_at: string | null;
  created_at: string;
}
