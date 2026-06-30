import React from 'react';
import { Target, CheckCircle2, Circle } from 'lucide-react';

const ExerciseTracker = ({ title, description, tasks }) => {
  return (
    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 mb-4 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-5 h-5 text-rose-400" />
        <h3 className="font-bold text-slate-100 text-lg">{title}</h3>
      </div>
      {description && <p className="text-sm text-slate-400 mb-4">{description}</p>}
      <div className="space-y-3">
        {tasks.map((task, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="mt-0.5">
              {task.completed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Circle className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div>
              <p className={`text-sm font-medium ${task.completed ? 'text-emerald-400' : 'text-slate-200'}`}>
                {task.label}
              </p>
              {task.hint && !task.completed && (
                <p className="text-xs text-slate-500 mt-1">{task.hint}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExerciseTracker;
