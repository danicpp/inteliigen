import { useState, useRef, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Network, FileText, Loader2, AlertCircle, Sparkles } from 'lucide-react';

function App() {
  const [text, setText] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [windowSize, setWindowSize] = useState([window.innerWidth, window.innerHeight]);

  const fgRef = useRef();

  useEffect(() => {
    const handleResize = () => setWindowSize([window.innerWidth, window.innerHeight]);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8080/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setGraphData({ nodes: data.nodes || [], links: data.links || [] });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to connect to the backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  const getNodeColor = (node) => {
    switch (node.group) {
      case 'Document': return '#F8FAFC'; // slate-50
      case 'PERSON': return '#FF719A'; // vibrant pink/red
      case 'ORG': return '#38BDF8'; // light blue
      case 'LOC':
      case 'GPE': return '#34D399'; // emerald
      case 'DATE':
      case 'TIME': return '#FBBF24'; // amber
      case 'EVENT': return '#A78BFA'; // violet
      case 'FAC':
      case 'PRODUCT': return '#F472B6'; // pink
      case 'MONEY': return '#2DD4BF'; // teal
      case 'NORP': return '#FB923C'; // orange
      default: return '#94A3B8'; // slate-400
    }
  };

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const label = node.label || 'Unknown';
    const fontSize = Math.max(12 / globalScale, 4); // Prevent text scaling too small
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;

    // Safely measure text width
    const textWidth = ctx.measureText(label).width || 10;
    const padding = fontSize * 0.8;

    // Ensure dimensions are valid numbers
    const width = Math.max(textWidth + padding, 20);
    const height = Math.max(fontSize + padding, 10);
    const bckgDimensions = [width, height];

    const isDoc = node.group === 'Document';

    try {
      // Draw a subtle glow
      ctx.shadowColor = getNodeColor(node);
      ctx.shadowBlur = isDoc ? 20 : 10;

      // Background Pill
      ctx.fillStyle = isDoc ? 'rgba(255,255,255,0.1)' : 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();

      // Safety check for roundRect which can throw if radii > size/2
      const radius = Math.min(bckgDimensions[1] / 2, width / 2, height / 2);
      ctx.roundRect(
        node.x - width / 2,
        node.y - height / 2,
        width,
        height,
        radius
      );
      ctx.fill();

      // Border
      ctx.shadowBlur = 0; // reset shadow for text
      ctx.strokeStyle = isDoc ? 'rgba(255,255,255,0.8)' : getNodeColor(node);
      ctx.lineWidth = isDoc ? 1.5 : 1;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDoc ? '#ffffff' : getNodeColor(node);
      ctx.fillText(label, node.x, node.y);
    } catch (e) {
      // Fallback simple rendering if roundRect fails on older browsers / edge cases
      ctx.fillStyle = getNodeColor(node);
      ctx.beginPath();
      ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
      ctx.fill();
    }

    node.__bckgDimensions = bckgDimensions;
  }, []);

  const nodePointerAreaPaint = useCallback((node, color, ctx) => {
    ctx.fillStyle = color;
    const bckgDimensions = node.__bckgDimensions;
    if (bckgDimensions && bckgDimensions.length === 2 && !isNaN(bckgDimensions[0]) && !isNaN(bckgDimensions[1])) {
      ctx.beginPath();
      ctx.roundRect(
        node.x - bckgDimensions[0] / 2,
        node.y - bckgDimensions[1] / 2,
        ...bckgDimensions,
        bckgDimensions[1] / 2
      );
      ctx.fill();
    } else {
      // Fallback pointer area if dimensions failed to calculate
      ctx.beginPath();
      ctx.arc(node.x, node.y, 10, 0, 2 * Math.PI, false);
      ctx.fill();
    }
  }, []);

  return (
    <div className="flex h-screen w-full bg-[#050505] text-slate-300 font-sans overflow-hidden">

      {/* Sidebar Panel */}
      <div className="w-[420px] min-w-[320px] bg-black/40 backdrop-blur-2xl border-r border-white/5 flex flex-col p-6 shadow-2xl z-10 relative">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

        <div className="flex items-center gap-4 mb-8">
          <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)] group relative">
            <div className="absolute inset-0 bg-blue-400/20 blur-md rounded-xl group-hover:bg-blue-400/30 transition-all duration-300"></div>
            <Network className="text-blue-400 w-7 h-7 relative z-10" />
          </div>
          <div>
            <h1 className="text-2xl font-outfit font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">Nexus Insight</h1>
            <p className="text-[10px] text-blue-400/80 uppercase tracking-widest font-semibold mt-1">Entity Intelligence</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Source Material
          </label>

          <div className="relative flex-1 group">
            <div className="absolute -inset-px bg-gradient-to-b from-blue-500/20 to-purple-500/20 rounded-xl blur-sm opacity-30 group-hover:opacity-60 transition duration-500"></div>
            <textarea
              className="relative w-full h-full bg-[#0c0c0e]/90 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none placeholder-slate-600 text-slate-200 transition-all custom-scrollbar leading-relaxed"
              placeholder="Paste intelligence reports, news articles, or raw text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-3 flex items-start gap-3 mt-1 duration-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 leading-relaxed">{error}</p>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isLoading || !text.trim()}
            className="mt-2 w-full relative group overflow-hidden bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none text-white font-medium py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] active:scale-[0.98]"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-blue-200" />
                <span className="tracking-wide">Analyzing Network...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                <span className="tracking-wide">Extract Entities</span>
              </>
            )}
          </button>
        </div>

        {/* Legend */}
        {graphData.nodes.length > 0 && (
          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3 duration-500">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1 font-outfit">Legend</h3>
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-2">
              <LegendItem color="#F8FAFC" label="Document" />
              <LegendItem color="#FF719A" label="Person" />
              <LegendItem color="#38BDF8" label="Organization" />
              <LegendItem color="#34D399" label="Location" />
              <LegendItem color="#FBBF24" label="Date / Time" />
              <LegendItem color="#A78BFA" label="Event" />
              <LegendItem color="#F472B6" label="Facility / Product" />
              <LegendItem color="#2DD4BF" label="Money" />
            </div>
          </div>
        )}
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 relative bg-[#050505] overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none"></div>

        {graphData.nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-10">
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-blue-500/10 blur-xl rounded-full"></div>
              <Network className="w-20 h-20 text-blue-500/30 relative drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse-slow" />
            </div>
            <h2 className="text-2xl font-outfit font-medium text-slate-300 mb-2 tracking-tight">Awaiting Intelligence</h2>
            <p className="text-sm text-slate-500 max-w-sm text-center leading-relaxed">Input source material in the panel to extract and visualize the entity relationship graph.</p>
          </div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            width={windowSize[0] - 420 > 0 ? windowSize[0] - 420 : 800}
            height={windowSize[1]}
            graphData={graphData}
            nodeLabel="group"
            nodeColor={getNodeColor}
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={nodePointerAreaPaint}
            linkColor={() => "rgba(255,255,255,0.15)"}
            linkWidth={1.5}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={1.5}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.4}
            onEngineStop={() => fgRef.current?.zoomToFit(600, 100)}
          />
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2.5 text-[0.8rem] text-slate-400 group cursor-default bg-white/[0.02] p-2 rounded-lg hover:bg-white/[0.06] hover:text-slate-300 transition-all border border-transparent hover:border-white/[0.05]">
      <span className="w-2.5 h-2.5 rounded-full shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }}></span>
      <span className="truncate">{label}</span>
    </div>
  );
}

export default App;
