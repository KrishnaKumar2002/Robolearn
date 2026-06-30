import React from 'react';
import { BookOpen, Info, Lightbulb, PlayCircle } from 'lucide-react';

const TheoryPanel = ({ title, description, sections }) => {
  return (
    <div className="w-96 bg-slate-800/80 backdrop-blur-xl border-l border-slate-700/50 flex flex-col h-full overflow-hidden shadow-2xl shrink-0">
      <div className="p-6 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {title}
          </h2>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="text-md font-semibold text-slate-100 flex items-center gap-2">
              {section.icon === 'info' && <Info className="w-4 h-4 text-blue-400" />}
              {section.icon === 'lightbulb' && <Lightbulb className="w-4 h-4 text-yellow-400" />}
              {section.icon === 'play' && <PlayCircle className="w-4 h-4 text-emerald-400" />}
              {section.title}
            </h3>
            <div className="text-sm text-slate-400 space-y-3 leading-relaxed">
              {section.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TheoryPanel;
