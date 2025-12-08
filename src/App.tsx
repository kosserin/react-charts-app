import "./App.css";
import Chart, { useWindowSize } from "./Chart";
import { COLORS } from "./Chart";

function App() {
  const { width } = useWindowSize();
  const isMobile = width !== undefined ? width < 1000 : false;

  return (
    <div className="App" style={{ overflow: "hidden", background: COLORS.bg }}>
      <header className="App-header">
        <h1>React with Recharts</h1>
      </header>
      <section
        style={{
          padding: `100px ${isMobile ? 16 : 48}px`,
          maxWidth: 1254,
          marginInline: 'auto',
        }}
      >
        <Chart />
      </section>
    </div>
  );
}

export default App;
