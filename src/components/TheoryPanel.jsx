import React from 'react';
import { BookOpen, Info, Lightbulb, PlayCircle } from 'lucide-react';

const TheoryPanel = ({ title, description, sections }) => {
  return (
    <div className="flex flex-col">
      <div className="p-5 border-b border-slate-700/50 bg-slate-800/80">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {title}
          </h2>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
      </div>
      
      <div className="p-5 space-y-6">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              {section.icon === 'info' && <Info className="w-4 h-4 text-blue-400" />}
              {section.icon === 'lightbulb' && <Lightbulb className="w-4 h-4 text-yellow-400" />}
              {section.icon === 'play' && <PlayCircle className="w-4 h-4 text-emerald-400" />}
              {section.title}
            </h3>
            <div className="text-sm text-slate-400 space-y-2 leading-relaxed">
              {section.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TheoryPanel;
