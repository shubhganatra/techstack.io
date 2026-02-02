'use client';

import { ChevronDown, Sparkles } from 'lucide-react';
import { useState } from 'react';
import CreatableSelect, { components, DropdownIndicatorProps } from 'react-select';
import { StylesConfig } from 'react-select';

// Custom Dropdown Indicator to match native select exact arrow
const DropdownIndicator = (props: DropdownIndicatorProps<any, true>) => {
  return (
    <components.DropdownIndicator {...props}>
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" fill="none">
        <path fill="#333" d="M0 0l6 8 6-8z"/>
      </svg>
    </components.DropdownIndicator>
  );
};

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

interface InputFormProps {
  appType: string[];
  setAppType: (val: string[]) => void;
  scale: string[];
  setScale: (val: string[]) => void;
  focus: string[];
  setFocus: (val: string[]) => void;
  teamSize: string[];
  setTeamSize: (val: string[]) => void;
  budget: string[];
  setBudget: (val: string[]) => void;
  timeToMarket: string[];
  setTimeToMarket: (val: string[]) => void;
  securityLevel: string;
  setSecurityLevel: (val: string) => void;
  customConstraints: string;
  setCustomConstraints: (val: string) => void;
  onGenerate: () => void;
  loading: boolean;
  openDropdown: string | null;
  setOpenDropdown: (val: string | null) => void;
}

export default function InputForm({
  appType, setAppType,
  scale, setScale,
  focus, setFocus,
  teamSize, setTeamSize,
  budget, setBudget,
  timeToMarket, setTimeToMarket,
  securityLevel, setSecurityLevel,
  customConstraints, setCustomConstraints,
  onGenerate,
  loading,
  openDropdown,
  setOpenDropdown
}: InputFormProps) {
  const [additionalDetailsOpen, setAdditionalDetailsOpen] = useState(false);

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

  const MultiSelect = ({ 
    label, 
    options, 
    values, 
    onChange,
    onRemove,
    instanceId,
    required = false
  }: { 
    label: string; 
    options: string[]; 
    values: string[]; 
    onChange: (val: string) => void;
    onRemove: (val: string) => void;
    instanceId: string;
    required?: boolean;
  }) => {
    const [inputValue, setInputValue] = useState('');
    const optionsFormatted = options.map(opt => ({ label: opt, value: opt }));
    const valuesFormatted = values.map(val => ({ label: val, value: val }));

    const handleChange = (newValues: any) => {
      const newValuesArray = newValues ? newValues.map((v: any) => v.value) : [];
      
      // Find what was added
      const added = newValuesArray.find((v: string) => !values.includes(v));
      if (added) {
        onChange(added);
        setInputValue('');
      }
      
      // Find what was removed
      const removed = values.find((v: string) => !newValuesArray.includes(v));
      if (removed) {
        onRemove(removed);
        setInputValue('');
      }
    };

    return (
      <div className="space-y-2">
        {label && (
          <label className="form-label">
            {label} {required && <span className="text-red-600">*</span>}
          </label>
        )}
        <CreatableSelect
          instanceId={instanceId}
          isMulti
          closeMenuOnSelect={false}
          blurInputOnSelect={false}
          inputValue={inputValue}
          onInputChange={(value) => setInputValue(value)}
          options={optionsFormatted}
          value={valuesFormatted}
          onChange={handleChange}
          placeholder={values.length === 0 ? "Add priorities..." : "Add more..."}
          className="react-select-container"
          classNamePrefix="react-select"
          components={{ DropdownIndicator, IndicatorSeparator: null }}
          isClearable={false}
          backspaceRemovesValue={true}
          unstyled
        />
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header - Stripped back, elegant */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Build Your Stack
        </h1>
        <div className="h-0.5 w-full bg-amber-600"></div>
        <p className="text-gray-600 text-sm mt-4">Describe your project to get tailored tech stack recommendations</p>
      </div>

      <form className="space-y-8">
        {/* Primary Input Block - Application Type */}
        <div>
          <label className="form-label">
            What are you building? <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g., Real-time collaboration tool, AI-powered analytics dashboard, Mobile-first marketplace"
            value={appType[0] || ''}
            onChange={(e) => setAppType(e.target.value ? [e.target.value] : [])}
            className="form-input"
          />
          <p className="form-hint">Be specific about the problem you're solving</p>
        </div>

        {/* Two Column - Scale & Focus */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scale */}
          <div>
            <label className="form-label">
              User Scale <span className="text-red-600">*</span>
            </label>
            <select
              value={scale[0] || ''}
              onChange={(e) => setScale(e.target.value ? [e.target.value] : [])}
              className="form-select"
            >
              <option value="">Choose a range...</option>
              {OPTIONS.scale.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <p className="form-hint">Expected concurrent and total users</p>
          </div>

          {/* Primary Focus - Multi */}
          <div>
            <label className="form-label">
              Key Priorities <span className="text-red-600">*</span>
            </label>
            <MultiSelect
              instanceId="primary-focus"
              label=""
              required={false}
              options={OPTIONS.focus}
              values={focus}
              onChange={(val) => {
                if (!focus.includes(val)) {
                  setFocus([...focus, val]);
                }
              }}
              onRemove={(val) => setFocus(focus.filter(v => v !== val))}
            />
            <p className="form-hint">What matters most for your architecture?</p>
          </div>
        </div>

        {/* Collapsible Section - Optional Constraints */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setAdditionalDetailsOpen(!additionalDetailsOpen)}
            className="collapsible-trigger"
          >
            <span className="font-medium text-gray-900">Additional Context</span>
            <ChevronDown
              size={20}
              className={`text-gray-600 transition-transform duration-200 ${
                additionalDetailsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {additionalDetailsOpen && (
            <div className="p-6 border border-t-0 border-gray-200 rounded-b-lg bg-gray-50 space-y-6">
              {/* First Row - Team Size, Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Team Size</label>
                  <select
                    value={teamSize[0] || ''}
                    onChange={(e) => setTeamSize(e.target.value ? [e.target.value] : [])}
                    className="form-select"
                  >
                    <option value="">Select...</option>
                    {OPTIONS.teamSize.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <p className="form-hint">Who will maintain this?</p>
                </div>

                <div>
                  <label className="form-label">Budget</label>
                  <select
                    value={budget[0] || ''}
                    onChange={(e) => setBudget(e.target.value ? [e.target.value] : [])}
                    className="form-select"
                  >
                    <option value="">Select...</option>
                    {OPTIONS.budget.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <p className="form-hint">Infrastructure & tool budget</p>
                </div>
              </div>

              {/* Second Row - Timeline, Security */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Timeline</label>
                  <select
                    value={timeToMarket[0] || ''}
                    onChange={(e) => setTimeToMarket(e.target.value ? [e.target.value] : [])}
                    className="form-select"
                  >
                    <option value="">Select...</option>
                    {OPTIONS.timeToMarket.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <p className="form-hint">When do you need to launch?</p>
                </div>

                <div>
                  <label className="form-label">Compliance</label>
                  <select
                    value={securityLevel}
                    onChange={(e) => setSecurityLevel(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select...</option>
                    {OPTIONS.securityLevel.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <p className="form-hint">Regulatory requirements</p>
                </div>
              </div>

              {/* Constraints - Full Width */}
              <div>
                <label className="form-label">Any constraints or preferences?</label>
                <textarea
                  placeholder="Specific tools you want, libraries to avoid, institutional knowledge, existing infrastructure to work with..."
                  rows={3}
                  value={customConstraints}
                  onChange={(e) => setCustomConstraints(e.target.value)}
                  className="form-input resize-none"
                />
                <p className="form-hint">Help us understand your context better</p>
              </div>
            </div>
          )}
        </div>

        {/* CTA Button - Clean, intentional */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading || !appType.length || !scale.length || !focus.length}
          className={`btn w-full text-lg font-semibold py-3.5 ${
            loading || !appType.length || !scale.length || !focus.length
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'btn-amber'
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="animate-pulse" />
              Analyzing your project...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles size={20} />
              Generate Recommendations
            </div>
          )}
        </button>
      </form>
    </div>
  );
}

