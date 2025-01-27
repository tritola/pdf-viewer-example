import React, { useState, useEffect, useRef } from 'react';
import { Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { OnHighlightKeyword } from '@react-pdf-viewer/search';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { Worker } from '@react-pdf-viewer/core';
import Split from 'react-split';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import './App.css';

interface Section {
    heading: string;
    summary: string;
    detailed_summary: string;
    section_text: string;
    page_number: number;
    subsections?: Section[];
}

interface ESMADocument {
    Name: string;
    overall_summary: string;
    executive_summary: string;
    sections: Section[];
}

const renderMarkdown = (text: string) => {
    return text.split(/(\*\*[^*]+\*\*)/).map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

interface SectionComponentProps {
    section: Section;
    level: number;
    onPageClick: (pageNumber: number) => void;
    globalExpanded: boolean | null;
    onExpandToggle?: () => void;
}

const SectionComponent: React.FC<SectionComponentProps> = ({ 
    section, 
    level, 
    onPageClick, 
    globalExpanded,
    onExpandToggle 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showFullText, setShowFullText] = useState(false);

    useEffect(() => {
        if (globalExpanded !== null) {
            setIsExpanded(globalExpanded);
        }
    }, [globalExpanded]);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
        onExpandToggle?.();
    };

    const handlePageClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPageClick(section.page_number);
    };

    return (
        <div style={{ marginLeft: `${level * 20}px` }} className="section">
            <div 
                className="section-box"
                onClick={handleClick}
            >
                <div className="section-header">
                    <span className="section-title">{section.heading}</span>
                    <div className="section-controls">
                        <button 
                            className="page-button"
                            onClick={handlePageClick}
                            title={`Go to page ${section.page_number}`}
                        >
                            p.{section.page_number}
                        </button>
                        <span className="expand-arrow">{isExpanded ? '▼' : '▶'}</span>
                    </div>
                </div>
                <p className="section-summary">{renderMarkdown(section.summary)}</p>
                
                {isExpanded && (
                    <div className="section-detailed-summary">
                        <p>{renderMarkdown(section.detailed_summary)}</p>
                        <div 
                            className="full-text-toggle"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowFullText(!showFullText);
                            }}
                        >
                            {showFullText ? 'Hide Full Text ▼' : 'Show Full Text ▶'}
                        </div>
                        {showFullText && (
                            <div className="full-text">
                                <p>{renderMarkdown(section.section_text)}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {section.subsections?.map((subsection, index) => (
                <SectionComponent 
                    key={index} 
                    section={subsection} 
                    level={level + 1}
                    onPageClick={onPageClick}
                    globalExpanded={globalExpanded}
                />
            ))}
        </div>
    );
};

const App: React.FC = () => {
    const [documentData, setDocumentData] = useState<ESMADocument | null>(null);
    const [summaryExpanded, setSummaryExpanded] = useState(false);
    const [pdfFile, setPdfFile] = useState<string>(`${process.env.PUBLIC_URL}/esma_strategy_2023-2028.pdf`);
    const [globalExpanded, setGlobalExpanded] = useState<boolean | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const fileInputJsonRef = useRef<HTMLInputElement>(null);
    const fileInputPdfRef = useRef<HTMLInputElement>(null);
    const pageNavigationPluginInstance = pageNavigationPlugin();

    useEffect(() => {
        fetch(`${process.env.PUBLIC_URL}/output-esma.json`)
            .then(response => response.json())
            .then(data => setDocumentData(data));

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    setDocumentData(json);
                } catch (error) {
                    alert('Invalid JSON file');
                }
            };
            reader.readAsText(file);
        }
    };

    const handlePdfUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPdfFile(url);
        }
    };

    const toggleExpandAll = () => {
        setGlobalExpanded(prev => prev === null ? true : !prev);
        setSummaryExpanded(prev => !prev);
    };

    const defaultLayoutPluginInstance = defaultLayoutPlugin({
        toolbarPlugin: {
            searchPlugin: {
                keyword: ['ESMA'],
                onHighlightKeyword: (props: OnHighlightKeyword) => {
                    props.highlightEle.style.outline = '1px dashed blue';
                    props.highlightEle.style.backgroundColor = 'rgba(0, 0, 255, 0.2)';
                },
            },
        },
    });

    const handlePageNavigation = (pageNumber: number) => {
        pageNavigationPluginInstance.jumpToPage(pageNumber - 1);
    };

    return (
        <Split 
            className="split-container"
            sizes={[50, 50]}
            minSize={200}
            gutterSize={10}
            snapOffset={50}
        >
            <div className="left-pane">
                <div className="menu-bar">
                    <div className="menu-bar-right">
                        <button 
                            className="menu-bar-button"
                            onClick={toggleExpandAll}
                            title={globalExpanded ? "Collapse All" : "Expand All"}
                        >
                            {globalExpanded ? "Collapse All" : "Expand All"}
                        </button>
                        <div className="menu-container" ref={menuRef}>
                            <button 
                                className="menu-bar-button"
                                onClick={() => setMenuOpen(!menuOpen)}
                                title="Menu"
                            >
                                ⋮
                            </button>
                            {menuOpen && (
                                <div className="menu-dropdown">
                                    <label className="menu-item">
                                        Upload JSON
                                        <input
                                            ref={fileInputJsonRef}
                                            type="file"
                                            accept=".json"
                                            onChange={handleJsonUpload}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                    <label className="menu-item">
                                        Upload PDF
                                        <input
                                            ref={fileInputPdfRef}
                                            type="file"
                                            accept=".pdf"
                                            onChange={handlePdfUpload}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {documentData && (
                    <div className="content-area">
                        <h1>{documentData.Name}</h1>
                        
                        <div className="section">
                            <div 
                                className="section-box"
                                onClick={() => setSummaryExpanded(!summaryExpanded)}
                            >
                                <div className="section-header">
                                    <span className="section-title">Summary</span>
                                    <span className="expand-arrow">{summaryExpanded ? '▼' : '▶'}</span>
                                </div>
                                <p className="section-summary">{renderMarkdown(documentData.overall_summary)}</p>
                                
                                {summaryExpanded && (
                                    <div className="section-detailed-summary">
                                        <p>{renderMarkdown(documentData.executive_summary)}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="sections">
                            <h2>Sections</h2>
                            {documentData.sections.map((section, index) => (
                                <SectionComponent 
                                    key={index} 
                                    section={section} 
                                    level={0}
                                    onPageClick={handlePageNavigation}
                                    globalExpanded={globalExpanded}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="right-pane">
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <Viewer
                        fileUrl={pdfFile}
                        plugins={[defaultLayoutPluginInstance, pageNavigationPluginInstance]}
                    />
                </Worker>
            </div>
        </Split>
    );
};

export default App;
