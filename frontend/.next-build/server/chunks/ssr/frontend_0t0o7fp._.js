module.exports=[96339,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"InvariantError",{enumerable:!0,get:function(){return d}});class d extends Error{constructor(a,b){super(`Invariant: ${a.endsWith(".")?a:a+"."} This is a bug in Next.js.`,b),this.name="InvariantError"}}},52596,(a,b,c)=>{let{createClientModuleProxy:d}=a.r(2497);a.n(d("[project]/frontend/node_modules/next/dist/client/script.js <module evaluation>"))},51062,(a,b,c)=>{let{createClientModuleProxy:d}=a.r(2497);a.n(d("[project]/frontend/node_modules/next/dist/client/script.js"))},75552,a=>{"use strict";a.i(52596);var b=a.i(51062);a.n(b)},52625,(a,b,c)=>{b.exports=a.r(75552)},50640,a=>{"use strict";a.s(["NetworkErrorRecovery",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call NetworkErrorRecovery() from the server but NetworkErrorRecovery is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/src/components/network-error-recovery.tsx <module evaluation>","NetworkErrorRecovery")},18573,a=>{"use strict";a.s(["NetworkErrorRecovery",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call NetworkErrorRecovery() from the server but NetworkErrorRecovery is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/src/components/network-error-recovery.tsx","NetworkErrorRecovery")},79326,a=>{"use strict";a.i(50640);var b=a.i(18573);a.n(b)},54074,a=>{"use strict";a.s(["ThemeSync",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call ThemeSync() from the server but ThemeSync is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/src/components/theme-sync.tsx <module evaluation>","ThemeSync")},90731,a=>{"use strict";a.s(["ThemeSync",()=>b]);let b=(0,a.i(2497).registerClientReference)(function(){throw Error("Attempted to call ThemeSync() from the server but ThemeSync is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"[project]/frontend/src/components/theme-sync.tsx","ThemeSync")},15695,a=>{"use strict";a.i(54074);var b=a.i(90731);a.n(b)},35829,a=>{"use strict";var b=a.i(18332),c=a.i(52625),d=a.i(67663),e=a.i(79326),f=a.i(15695),g=a.i(67405);let h=["violet","light","dark","mono"],i=new Set(h),j=`(() => {
  const validThemes = new Set(${JSON.stringify(h)});
  const defaultTheme = ${JSON.stringify("light")};
  const storageKey = ${JSON.stringify("pos-mans-owner-theme")};
  const systemThemeOnlyPaths = new Set(["/", "/login"]);
  try {
    if (systemThemeOnlyPaths.has(window.location.pathname)) {
      document.documentElement.dataset.storeTheme = defaultTheme;
      document.documentElement.dataset.userThemeSource = "system";
      return;
    }

    const serverTheme = document.documentElement.dataset.serverStoreTheme;
    const hasServerTheme = document.documentElement.dataset.userThemeSource === "server";
    if (hasServerTheme) {
      if (validThemes.has(serverTheme)) {
        document.documentElement.dataset.storeTheme = serverTheme;
        window.localStorage.setItem(storageKey, serverTheme);
      }
    } else {
      const savedTheme = window.localStorage.getItem(storageKey);
      if (validThemes.has(savedTheme)) {
        document.documentElement.dataset.storeTheme = savedTheme;
      } else {
        document.documentElement.dataset.storeTheme = defaultTheme;
      }
    }
  } catch {
    // Storage can be unavailable in private mode or hardened browsers; keep the server theme.
  }
})();`;async function k({children:a}){let h=await (0,g.getCurrentSession)(),l=await (0,d.cookies)(),m=l.get("pos-mans-owner-theme")?.value,n=m&&i.has(m)?m:null,o=h?.user.storeRole==="OWNER"&&h.user.ownerTheme?h.user.ownerTheme:n||"light",p=h?.user.storeRole==="OWNER"&&h.user.ownerTheme||n?"server":"local";return(0,b.jsxs)("html",{lang:"th",suppressHydrationWarning:!0,"data-scroll-behavior":"smooth","data-store-theme":o,"data-server-store-theme":o,"data-user-theme-source":p,children:[(0,b.jsx)("head",{children:(0,b.jsx)(c.default,{id:"owner-theme-init",strategy:"beforeInteractive",dangerouslySetInnerHTML:{__html:j}})}),(0,b.jsxs)("body",{suppressHydrationWarning:!0,children:[(0,b.jsx)(e.NetworkErrorRecovery,{}),(0,b.jsx)(f.ThemeSync,{serverTheme:o,source:p}),a]})]})}a.s(["default",0,k,"metadata",0,{applicationName:"POS MANS",title:"POS MANS",description:"Owner and superadmin workspaces for POS MANS",manifest:"/site.webmanifest",appleWebApp:{capable:!0,statusBarStyle:"default",title:"POS MANS"},formatDetection:{telephone:!1},icons:{icon:[{url:"/favicon.ico"},{url:"/favicon-16x16.png",sizes:"16x16",type:"image/png"},{url:"/favicon-32x32.png",sizes:"32x32",type:"image/png"}],apple:[{url:"/apple-touch-icon.png",sizes:"180x180",type:"image/png"}]},other:{"mobile-web-app-capable":"yes","apple-mobile-web-app-capable":"yes","apple-mobile-web-app-title":"POS MANS"}},"viewport",0,{width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#ffffff"}],35829)},36399,a=>{a.n(a.i(35829))}];

//# sourceMappingURL=frontend_0t0o7fp._.js.map