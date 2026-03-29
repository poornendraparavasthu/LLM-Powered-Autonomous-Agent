import { Toaster as Sonner } from "sonner";

function Toaster(props) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={{
        "--normal-bg": "hsl(var(--surface-2))",
        "--normal-text": "hsl(var(--ink))",
        "--normal-border": "hsl(var(--line-2))",
      }}
      toastOptions={{
        style: {
          fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
          fontSize: "0.85rem",
          borderRadius: "10px",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
