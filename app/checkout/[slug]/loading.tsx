export default function CheckoutLoading() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'row', minHeight: '100vh',
      background: 'linear-gradient(to right, #012B5D 50%, #FFFFFF 50%)',
    }}>
      <style>{`
        @keyframes sk-p { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .sk-p { animation: sk-p 1.5s ease-in-out infinite; }
        @media (max-width: 768px) {
          .sk-split { background: #FFFFFF !important; flex-direction: column !important; }
          .sk-left { display: none !important; }
          .sk-right { width: 100% !important; padding: 24px 16px !important; max-width: 100% !important; justify-content: flex-start !important; }
        }
      `}</style>
      <div className="sk-split sk-left" style={{ width: '50%', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '100%', maxWidth: '420px', padding: '48px 80px 48px 24px' }}>
          <div className="sk-p" style={{ height: '28px', width: '120px', marginBottom: '40px', background: 'rgba(255,255,255,0.15)', borderRadius: '4px' }} />
          <div className="sk-p" style={{ height: '160px', width: '160px', borderRadius: '12px', marginBottom: '20px', background: 'rgba(255,255,255,0.1)' }} />
          <div className="sk-p" style={{ height: '18px', width: '70%', marginBottom: '10px', background: 'rgba(255,255,255,0.15)', borderRadius: '4px' }} />
          <div className="sk-p" style={{ height: '14px', width: '50%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }} />
        </div>
      </div>
      <div className="sk-right" style={{ width: '50%', display: 'flex', justifyContent: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: '480px', padding: '48px 24px 48px 48px' }}>
          <div className="sk-p" style={{ height: '16px', width: '140px', marginBottom: '16px', background: '#e5e7eb', borderRadius: '4px' }} />
          <div className="sk-p" style={{ height: '36px', width: '100%', marginBottom: '2px', background: '#e5e7eb', borderRadius: '6px 6px 0 0' }} />
          <div className="sk-p" style={{ height: '36px', width: '100%', marginBottom: '24px', background: '#e5e7eb', borderRadius: '0 0 6px 6px' }} />
          <div className="sk-p" style={{ height: '16px', width: '160px', marginBottom: '16px', background: '#e5e7eb', borderRadius: '4px' }} />
          <div className="sk-p" style={{ height: '40px', width: '100%', marginBottom: '8px', background: '#e5e7eb', borderRadius: '6px' }} />
          <div className="sk-p" style={{ height: '40px', width: '100%', marginBottom: '32px', background: '#e5e7eb', borderRadius: '6px' }} />
          <div className="sk-p" style={{ height: '44px', width: '100%', borderRadius: '6px', background: 'rgba(255,240,42,0.3)' }} />
        </div>
      </div>
    </div>
  )
}
