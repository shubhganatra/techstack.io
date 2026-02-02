'use client';

import { Download, FileText } from 'lucide-react';
import { getTechLogo } from '@/lib/techLogos';
import { useState } from 'react';

interface TechItem {
  name: string;
  icon?: string;
  pros: string[];
  cons: string[];
  why: string;
}

interface TechStackDisplayProps {
  frontend: TechItem[];
  backend: TechItem[];
  database: TechItem[];
  devops: TechItem[];
  additional: TechItem[];
  onDownloadPDF: () => void;
  onNewStack: () => void;
}

export default function TechStackDisplay({
  frontend,
  backend,
  database,
  devops,
  additional,
  onDownloadPDF,
  onNewStack,
}: TechStackDisplayProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const getTechDisplay = (techName: string, fallbackIcon: string | undefined) => {
    const logo = getTechLogo(techName);
    
    // First try the fallback icon from response
    if (fallbackIcon && fallbackIcon.length > 0) {
      return fallbackIcon;
    }

    if (failedImages.has(techName)) {
      return logo.fallback;
    }

    if (logo.url) {
      return (
        <img
          src={logo.url}
          alt={techName}
          className="w-8 h-8 object-contain"
          onError={() => {
            setFailedImages((prev) => new Set([...prev, techName]));
          }}
        />
      );
    }

    return logo.fallback;
  };

  const renderCategory = (title: string, techs: TechItem[], categoryIndex: number) => {
    if (!techs || techs.length === 0) return null;

    const colors = [
      { border: 'border-l-amber-600', bg: 'bg-amber-50' },
      { border: 'border-l-blue-600', bg: 'bg-blue-50' },
      { border: 'border-l-emerald-600', bg: 'bg-emerald-50' },
      { border: 'border-l-purple-600', bg: 'bg-purple-50' },
      { border: 'border-l-pink-600', bg: 'bg-pink-50' },
    ];

    const colorScheme = colors[categoryIndex % colors.length];

    return (
      <section className="mb-12">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">{title}</h2>
          <div className="accent-line w-full"></div>
        </div>
        
        <div className="space-y-5">
          {techs.map((tech, idx) => (
            <div key={idx} className={`border-l-4 ${colorScheme.border} ${colorScheme.bg} rounded-r-lg p-5 border border-l-4 hover:shadow-md transition-all`}>
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex items-center justify-center w-10 h-10 flex-shrink-0 rounded-lg bg-white border border-gray-300 shadow-sm">
                  {getTechDisplay(tech.name, tech.icon)}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">{tech.name}</h3>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{tech.why}</p>
                </div>
              </div>

              {/* Pros & Cons - Two column layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5 pt-5 border-t border-gray-300">
                <div>
                  <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    Strengths
                  </p>
                  <ul className="space-y-2">
                    {tech.pros && tech.pros.length > 0 ? (
                      tech.pros.map((pro, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-emerald-600 font-bold flex-shrink-0 mt-0.5">·</span>
                          <span>{pro}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-gray-500 italic">No details available</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="text-amber-600 font-bold">!</span>
                    Considerations
                  </p>
                  <ul className="space-y-2">
                    {tech.cons && tech.cons.length > 0 ? (
                      tech.cons.map((con, i) => (
                        <li key={i} className="text-sm text-gray-700 flex gap-2">
                          <span className="text-amber-600 font-bold flex-shrink-0 mt-0.5">·</span>
                          <span>{con}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-gray-500 italic">No details available</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Generated Architecture</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onDownloadPDF}
              className="btn btn-amber flex items-center gap-2"
            >
              <Download size={16} />
              Download PDF Report
            </button>
            <button
              onClick={onNewStack}
              className="btn btn-secondary hover:bg-amber-50 hover:border-amber-300"
            >
              Generate New Stack
            </button>
          </div>
        </div>
        <div className="accent-line w-full"></div>
      </div>

      {/* Tech Sections */}
      <div className="space-y-2">
        {renderCategory('Frontend', frontend, 0)}
        {renderCategory('Backend', backend, 1)}
        {renderCategory('Database', database, 2)}
        {renderCategory('DevOps & Infrastructure', devops, 3)}
        {renderCategory('Additional Services', additional, 4)}
      </div>
    </div>
  );
}
