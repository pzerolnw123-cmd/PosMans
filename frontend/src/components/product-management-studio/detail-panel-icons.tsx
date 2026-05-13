type DetailPanelIconProps = {
  className?: string;
};

export function StockBoxIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeLinejoin="round" d="M1.583 4.5L8 1.583L14.417 4.5m-12.834 0L8 7.417M1.583 4.5v6.417L8 14.417m0-7L14.417 4.5M8 7.417v7M14.417 4.5v6.417L8 14.417M10.5 13V9.5m2 2.5V8.5" />
    </svg>
  );
}

export function SaveIcon({ className }: DetailPanelIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m15.078 5.626l.537-.843l-.537.843c.348.222.661.528 1.493 1.36l.707-.708l-.707.707l.954.954c.31.31.425.426.524.543a4 4 0 0 1 .938 2.264c.012.153.013.316.013.754v.5c0 1.417 0 2.419-.065 3.203c-.063.772-.182 1.243-.371 1.613a4 4 0 0 1-1.748 1.748c-.37.189-.841.308-1.613.371C14.419 19 13.417 19 12 19s-2.419 0-3.203-.065c-.771-.063-1.243-.182-1.613-.371a4 4 0 0 1-1.748-1.748c-.189-.37-.308-.841-.371-1.613C5 14.419 5 13.417 5 12v-.222c0-1.31 0-2.238.056-2.965c.054-.716.157-1.156.319-1.504a4 4 0 0 1 1.934-1.934c.348-.162.788-.265 1.504-.32C9.54 5.002 10.467 5 11.778 5c1.176 0 1.614.006 2.017.095c.455.1.89.28 1.283.531Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a2 2 0 1 0 0-4a2 2 0 0 0 0 4m2-9.5V7a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V5.2" />
      </g>
    </svg>
  );
}

export function ImageIcon({ className }: DetailPanelIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <rect width="14" height="14" x="5" y="5" rx="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m5.14 15.32l3.55-3.754A1.75 1.75 0 0 1 9.969 11c.479 0 .938.204 1.277.566L15.387 16m-1.806-1.934l1.432-1.533a1.75 1.75 0 0 1 1.277-.566c.48 0 .939.204 1.277.566l1.274 1.43m-5.063-4.63h.009" />
      </g>
    </svg>
  );
}

export function BackIcon({ className }: DetailPanelIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className={className}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.333 13.667L6 10.333L9.333 7M6 10.333h9.167a3.333 3.333 0 0 1 0 6.667h-.834" />
    </svg>
  );
}

export function CloseSaleIcon({ className }: DetailPanelIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className={className}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m8 8l4 4m0 0l4 4m-4-4l4-4m-4 4l-4 4" />
    </svg>
  );
}

export function OpenSaleIcon({ className }: DetailPanelIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className={className}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m7 12l3.488 3.837a.2.2 0 0 0 .296 0L17 9" />
    </svg>
  );
}

export function ResetIcon({ className }: DetailPanelIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className={className}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m14.883 15.833l3.334-3.333m0 0l-3.334-3.333m3.334 3.333H10.05a3.333 3.333 0 0 0-3.333 3.333" />
    </svg>
  );
}

export function DeleteIcon({ className }: DetailPanelIconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className={className}>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.133 7.723q.435.06.867.128m-.867-.128l-.906 9.68c-.037.434-.254.84-.607 1.136a2.02 2.02 0 0 1-1.297.461H8.677c-.48 0-.944-.164-1.297-.46a1.67 1.67 0 0 1-.607-1.138l-.906-9.679m12.266 0a45 45 0 0 0-2.951-.305m-9.315.305q-.435.06-.867.127m.867-.127a45 45 0 0 1 2.951-.305m6.364 0a45.5 45.5 0 0 0-6.364 0m6.364 0c0-2.114-1.455-3.07-3.182-3.07S8.818 5.44 8.818 7.418M10.5 15.5L10 11m4 0l-.5 4.5" />
    </svg>
  );
}
