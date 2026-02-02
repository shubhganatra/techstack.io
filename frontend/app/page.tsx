'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Server, Zap, Database, ArrowRight, Loader2, FileText, X } from 'lucide-react';
import Mermaid from '@/components/Mermaid';
import TechStackDisplay from '@/components/TechStackDisplay';
import InputForm from '@/components/InputForm';
import { parseTechStackResponse, generatePDF, TechStackData } from '@/lib/pdfGenerator';

// Predefined options for multi-select fields
const OPTIONS = {
  appType: [
    'E-commerce', 'SaaS', 'Mobile App', 'Social Network', 'Dating', 
    'Marketplace', 'Content Platform', 'Analytics', 'Gaming', 'Healthcare',
    'Finance', 'Education', 'Real Estate', 'Booking System', 'Streaming'
  ],
  scale: [
    'MVP (1K-10K users)', 'Growth (10K-100K users)', 'Scale (100K-1M users)', 
    'Enterprise (1M+ users)', 'High Availability', 'Global Scale'
  ],
  focus: [
    'Cost Optimization', 'Performance', 'Security', 'Scalability', 'Time to Market',
    'Developer Experience', 'Maintenance', 'Reliability', 'Data Privacy', 'User Experience'
  ],
  teamSize: [
    'Solo (1 person)', 'Small (2-5)', 'Medium (5-10)', 'Large (10-20)', 'Enterprise (20+)'
  ],
  budget: [
    'Minimal (<$1K)', 'Small ($1K-$5K)', 'Medium ($5K-$20K)', 'Large ($20K-$100K)', 'Enterprise ($100K+)'
  ],
  timeToMarket: [
    'ASAP (1-2 weeks)', 'Quick (1-2 months)', 'Moderate (3-6 months)', 'Standard (6-12 months)', 'Long-term (12+ months)'
  ],
  securityLevel: [
    'Standard', 'SOC 2', 'GDPR', 'HIPAA', 'PCI-DSS', 'NIST', 'ISO 27001'
  ]
};

export default function Home() {
  const [appType, setAppType] = useState<string[]>([]);
  const [scale, setScale] = useState<string[]>([]);
  const [focus, setFocus] = useState<string[]>([]);
  const [teamSize, setTeamSize] = useState<string[]>([]);
  const [budget, setBudget] = useState<string[]>([]);
  const [timeToMarket, setTimeToMarket] = useState<string[]>([]);
  const [securityLevel, setSecurityLevel] = useState('');
  const [customConstraints, setCustomConstraints] = useState('');
  
  const [result, setResult] = useState('');
  const [techStackData, setTechStackData] = useState<Partial<TechStackData> | null>(null);
  const [loading, setLoading] = useState(false);
  
  // State for dropdown menus
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  const [appTypeCustom, setAppTypeCustom] = useState('');
  const [scaleCustom, setScaleCustom] = useState('');
  const [focusCustom, setFocusCustom] = useState('');
  const [teamSizeCustom, setTeamSizeCustom] = useState('');
  const [budgetCustom, setBudgetCustom] = useState('');
  const [timeToMarketCustom, setTimeToMarketCustom] = useState('');
  
  const preprocessContent = (content: string) => {
    return content;
  };

  // Multi-select helper functions
  const toggleMultiSelect = (field: string, value: string) => {
    const setterMap: { [key: string]: (val: string[]) => void } = {
      appType: setAppType,
      scale: setScale,
      focus: setFocus,
      teamSize: setTeamSize,
      budget: setBudget,
      timeToMarket: setTimeToMarket,
    };
    const getterMap: { [key: string]: string[] } = {
      appType,
      scale,
      focus,
      teamSize,
      budget,
      timeToMarket,
    };
    
    const currentValues = getterMap[field];
    const setter = setterMap[field];
    
    if (currentValues.includes(value)) {
      setter(currentValues.filter(v => v !== value));
    } else {
      setter([...currentValues, value]);
    }
  };

  const addCustomOption = (field: string, value: string) => {
    if (!value.trim()) return;
    
    const setterMap: { [key: string]: (val: string[]) => void } = {
      appType: setAppType,
      scale: setScale,
      focus: setFocus,
      teamSize: setTeamSize,
      budget: setBudget,
      timeToMarket: setTimeToMarket,
    };
    const getterMap: { [key: string]: string[] } = {
      appType,
      scale,
      focus,
      teamSize,
      budget,
      timeToMarket,
    };
    const customSetterMap: { [key: string]: (val: string) => void } = {
      appType: setAppTypeCustom,
      scale: setScaleCustom,
      focus: setFocusCustom,
      teamSize: setTeamSizeCustom,
      budget: setBudgetCustom,
      timeToMarket: setTimeToMarketCustom,
    };
    
    const currentValues = getterMap[field];
    const setter = setterMap[field];
    const customSetter = customSetterMap[field];
    
    if (!currentValues.includes(value)) {
      setter([...currentValues, value]);
    }
    customSetter('');
    setOpenDropdown(null);
  };

  const removeOption = (field: string, value: string) => {
    const setterMap: { [key: string]: (val: string[]) => void } = {
      appType: setAppType,
      scale: setScale,
      focus: setFocus,
      teamSize: setTeamSize,
      budget: setBudget,
      timeToMarket: setTimeToMarket,
    };
    const getterMap: { [key: string]: string[] } = {
      appType,
      scale,
      focus,
      teamSize,
      budget,
      timeToMarket,
    };
    
    const currentValues = getterMap[field];
    const setter = setterMap[field];
    setter(currentValues.filter(v => v !== value));
  };

  const validateAndCleanMermaidCode = (code: string) => {
    // First sanitize basic HTML entities
    let cleaned = code
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .trim();

    // Process line by line to fix and filter
    let lines = cleaned.split('\n').map(line => {
      line = line.trim();
      
      // Skip incomplete arrows completely
      if (line.endsWith('-->|') || line.endsWith('-->') || /-->\|[^|]*\|?\s*$/.test(line)) {
        return ''; // Mark for removal
      }
      
      // Fix unclosed brackets on non-arrow lines
      if (line && line.includes('[') && !line.includes(']') && !line.includes('-->')) {
        line = line + ']';
      }
      
      // Fix unclosed brackets on arrow target lines
      if (line && line.includes('-->') && line.includes('[') && !line.includes(']')) {
        if (line.trim().endsWith('[')) {
          line = line + ']';
        } else {
          return ''; // Malformed, remove
        }
      }
      
      return line;
    }).filter(line => line.trim());

    cleaned = lines.join('\n');

    // Replace spaces with underscores in node labels
    cleaned = cleaned.replace(/(\[)([^\]]+)(\])/g, (match, start, content, end) => {
      return start + content.replace(/ +/g, '_') + end;
    });

    // Replace spaces with underscores in arrow labels
    cleaned = cleaned.replace(/(\|)([^\|]+)(\|)/g, (match, start, content, end) => {
      return start + content.replace(/ +/g, '_') + end;
    });

    // Remove incomplete arrows
    cleaned = cleaned.split('\n').map(line => {
      line = line.trim();
      if (line.endsWith('-->|')) {
        return line.slice(0, -2); // Remove trailing pipe
      }
      return line;
    }).join('\n');

    return cleaned.trim();
  };

  const generateStack = async () => {
    if (!appType.length || !scale.length || !focus.length) return;

    setLoading(true);
    setResult('');
    setTechStackData(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appType: appType.join(', '),
          scale: scale.join(', '),
          focus: focus.join(', '),
          teamSize: teamSize.join(', '),
          budget: budget.join(', '),
          timeToMarket: timeToMarket.join(', '),
          securityLevel,
          customConstraints
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      // The response is now already structured
      const finalData = {
        primary: data.primary,
        alternatives: data.alternatives || [],
        alternative_explanations: data.alternative_explanations || [],
        mermaid_diagram: data.architecture_diagram,
        inputs: {
          appType: appType.join(', '),
          scale: scale.join(', '),
          focus: focus.join(', '),
          teamSize: teamSize.join(', '),
          budget: budget.join(', '),
          timeToMarket: timeToMarket.join(', '),
          securityLevel,
          customConstraints
        },
      } as any as TechStackData;
      
      setTechStackData(finalData);
      console.log('Final data:', finalData);

    } catch (error) {
      console.error("Error fetching stack:", error);
      setResult("❌ Connection Failed. Make sure Backend is running!");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (techStackData && techStackData.primary) {
      await generatePDF(techStackData as TechStackData);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Minimal Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                TechStack<span className="text-amber-600">.Stud</span>
                <span className="inline-block transform -translate-y-1">I</span>
                <span className="inline-block transform translate-y-1">/O</span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">Get personalized tech stack recommendations</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
              <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-amber-700">Ready to build</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Input Section */}
        {!techStackData && (
          <div>
            <InputForm
              appType={appType}
              setAppType={setAppType}
              scale={scale}
              setScale={setScale}
              focus={focus}
              setFocus={setFocus}
              teamSize={teamSize}
              setTeamSize={setTeamSize}
              budget={budget}
              setBudget={setBudget}
              timeToMarket={timeToMarket}
              setTimeToMarket={setTimeToMarket}
              securityLevel={securityLevel}
              setSecurityLevel={setSecurityLevel}
              customConstraints={customConstraints}
              setCustomConstraints={setCustomConstraints}
              onGenerate={generateStack}
              loading={loading}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
            />
          </div>
        )}

        {/* Loading State - Elegant overlay */}
        {loading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-400 rounded-full animate-spin" style={{clipPath: 'polygon(0 0, 100% 0, 100% 30%, 0 30%)'}}></div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Analyzing your requirements...</h3>
              <p className="text-gray-600 text-sm">Building your personalized tech stack</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {techStackData && !loading && (
          <div className="space-y-16">
            
            {/* Tech Stack Display */}
            {techStackData && techStackData.primary && (
              (techStackData.primary.frontend?.length || 0) +
              (techStackData.primary.backend?.length || 0) +
              (techStackData.primary.database?.length || 0) +
              (techStackData.primary.devops?.length || 0) +
              (techStackData.primary.additional?.length || 0) > 0
            ) ? (
              <TechStackDisplay
                frontend={techStackData.primary?.frontend || []}
                backend={techStackData.primary?.backend || []}
                database={techStackData.primary?.database || []}
                devops={techStackData.primary?.devops || []}
                additional={techStackData.primary?.additional || []}
                onDownloadPDF={handleDownloadPDF}
                onNewStack={() => {
                  setTechStackData(null);
                  setResult('');
                }}
              />
            ) : null}

            {/* Alternative Stacks Section */}
            {techStackData.alternatives && techStackData.alternatives.length > 0 && (
              <section>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Alternative Approaches</h2>
                  <div className="accent-line w-full"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {techStackData.alternatives.map((alt, idx) => (
                    <div key={idx} className="border border-gray-300 rounded-lg p-6 hover:border-amber-400 hover:shadow-lg hover:bg-amber-50 transition-all">
                      <div className="flex items-start gap-2 mb-3">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex-shrink-0">{idx + 1}</span>
                        <h3 className="font-semibold text-gray-900">Alternative Approach</h3>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        {typeof techStackData.alternative_explanations?.[idx] === 'string' 
                          ? techStackData.alternative_explanations[idx]
                          : techStackData.alternative_explanations?.[idx]?.trade_off || 'Trade-off focused approach'}
                      </p>
                      
                      {/* Stack summary */}
                      <div className="space-y-3 pt-4 border-t border-gray-300">
                        {alt.frontend && alt.frontend.length > 0 && (
                          <div className="text-sm">
                            <p className="font-medium text-gray-900 text-xs uppercase tracking-wide mb-1">Frontend</p>
                            <p className="text-gray-600 text-sm">{alt.frontend.map(t => t.name).join(', ')}</p>
                          </div>
                        )}
                        {alt.backend && alt.backend.length > 0 && (
                          <div className="text-sm">
                            <p className="font-medium text-gray-900 text-xs uppercase tracking-wide mb-1">Backend</p>
                            <p className="text-gray-600 text-sm">{alt.backend.map(t => t.name).join(', ')}</p>
                          </div>
                        )}
                        {alt.database && alt.database.length > 0 && (
                          <div className="text-sm">
                            <p className="font-medium text-gray-900 text-xs uppercase tracking-wide mb-1">Database</p>
                            <p className="text-gray-600 text-sm">{alt.database.map(t => t.name).join(', ')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Architecture Diagram Section */}
            {techStackData.mermaid_diagram && (
              <section>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Architecture Diagram</h2>
                  <div className="accent-line w-full"></div>
                </div>
                <div className="border border-gray-300 rounded-lg p-8 bg-gray-50 hover:bg-white hover:shadow-lg overflow-x-auto transition-all">
                  <Mermaid chart={techStackData.mermaid_diagram} />
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}