import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  clearSystemStorageCache,
  getSystemStoragePrefix,
  loadSystemState,
  saveLoadedSystemState,
} from "./supabase-storage";
import { supabase, supabaseConfigured } from "./supabase";
import "./portal.css";
import "./styles.css";

const baseUrl = import.meta.env.BASE_URL;
const formUrl =
  "https://docs.google.com/forms/d/1BDocUS5J6E7fAREA5yRss9-AtJF7OATRQU3U7uTCD6w/viewform?edit_requested=true&pli=1";
const ticketUrl = "https://upacentral.netlify.app/";

const systems = [
  {
    id: "cabecalho",
    title: "Cabeceira do Paciente",
    category: "Assistencial",
    description: "Informações e identificação à beira do leito.",
    file: "CABECEIRA DO PACIENTE.html",
  },
  {
    id: "dietas",
    title: "Mapa de Dietas 3.0",
    category: "Nutrição",
    description: "Controle e organização das dietas dos pacientes.",
    file: "MAPA DE DIETAS 3.0.html",
  },
  {
    id: "processo",
    title: "Processo de Enfermagem",
    category: "Enfermagem",
    description: "Registro e acompanhamento do processo de enfermagem.",
    file: "PROCESSO DE ENFERMAGEM.html",
  },
  {
    id: "sae",
    title: "SAE Enfermagem",
    category: "Enfermagem",
    description: "Sistematização da Assistência de Enfermagem.",
    file: "SAE ENFERMAGEM.html",
  },
];

const extensions = [
  [200, "Recepção"],
  [201, "Sala Verde"],
  [202, "Triagem 2"],
  [203, "Farmácia"],
  [204, "Consultório 3"],
  [205, "Sala Amarela"],
  [206, "Consultório 10"],
  [207, "Sutura"],
  [208, "Vermelha"],
  [209, "Psiquiatria"],
  [210, "Serviço Social"],
  [211, "Odontologia"],
  [212, "SCIH"],
  [213, "Pediatria"],
  [214, "Médicos"],
  [215, "SESMT"],
  [216, "Laboratório"],
  [217, "Respiratório"],
  [218, "Consultório 4"],
  [219, "Consultório 2"],
  [220, "Consultório 9"],
  [221, "Consultório 8"],
  [222, "Consultório 7"],
  [223, "Consultório 6"],
  [227, "Consultório 1"],
  [229, "Sala TI"],
  [230, "Consultório 5"],
  [231, "Direção Geral"],
];

const legacyApps = Object.fromEntries(
  systems.map((system) => [
    system.id,
    { id: system.id, title: system.title, file: system.file },
  ]),
);

function scrollToSection(sectionId) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

function useRevealAnimations(search) {
  React.useEffect(() => {
    const elements = document.querySelectorAll(".rev");

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("on"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("on");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    elements.forEach((element, index) => {
      element.style.transitionDelay = `${(index % 6) * 80}ms`;
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [search]);
}

function PreviewFrame({ file, title }) {
  const frameRef = React.useRef(null);

  React.useEffect(() => {
    const card = frameRef.current?.closest(".card");
    if (!card) return undefined;

    const updateScale = () => {
      card.style.setProperty("--s", (card.clientWidth / 1280) * 1.02);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <iframe
      className="prev"
      ref={frameRef}
      src={`${baseUrl}legacy/${encodeURIComponent(file)}`}
      loading="lazy"
      tabIndex="-1"
      title={`Prévia de ${title}`}
    />
  );
}

function SystemCard({ system }) {
  return (
    <Link className="card rev" to={`/apps/${system.id}`}>
      <PreviewFrame file={system.file} title={system.title} />
      <span className="tag">{system.category}</span>
      <div className="info">
        <h3>{system.title}</h3>
        <p>{system.description}</p>
        <span className="btn">Abrir sistema →</span>
      </div>
    </Link>
  );
}

function EventCard() {
  return (
    <a className="card rev" href={formUrl} target="_blank" rel="noreferrer">
      <img
        className="preview-image"
        src={`${baseUrl}legacy/eventos-adversos-preview.png`}
        alt=""
        loading="lazy"
      />
      <span className="tag">Eventos Adversos</span>
      <div className="info">
        <h3>Eventos Adversos</h3>
        <p>Sistematização de Eventos Adversos</p>
        <span className="btn">Abrir sistema →</span>
      </div>
    </a>
  );
}

function HomePage({ onSignOut }) {
  const [search, setSearch] = React.useState("");
  const filteredExtensions = extensions.filter(([number, label]) =>
    `${number} ${label}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR").trim()),
  );

  useRevealAnimations(search);

  return (
    <>
      <div className="aura" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <nav aria-label="Navegação principal">
        <a
          href="#inicio"
          onClick={(event) => {
            event.preventDefault();
            scrollToSection("inicio");
          }}
        >
          Início
        </a>
        <a
          href="#sistemas"
          onClick={(event) => {
            event.preventDefault();
            scrollToSection("sistemas");
          }}
        >
          Sistemas
        </a>
        <a
          href="#ramais"
          onClick={(event) => {
            event.preventDefault();
            scrollToSection("ramais");
          }}
        >
          Ramais
        </a>
        <a
          href="#chamado"
          onClick={(event) => {
            event.preventDefault();
            scrollToSection("chamado");
          }}
        >
          Abra seu Chamado
        </a>
      </nav>

      <main>
        <section id="inicio">
          <div className="logo-box rev">
            <img
              src={`${baseUrl}assets/fucs-logo.jpg`}
              alt="Logo FUCS - Fundação Universidade de Caxias do Sul"
            />
          </div>
          <h1 className="hero-titulo rev">Fluxo Upa Central</h1>
          <p className="hero-sub rev">Fundação Universidade de Caxias do Sul</p>
          <div className="faixa rev">UPA Central 24H - FUCS</div>
          <div className="badge24 rev">
            <span className="dot" />
            Atendimento 24H
          </div>
          <div className="seta" aria-hidden="true">⌄</div>
        </section>

        <section id="sistemas">
          <h2 className="titulo rev">🖥️ Sistemas</h2>
          <div className="grade">
            {systems.map((system) => (
              <SystemCard key={system.id} system={system} />
            ))}
            <EventCard />
          </div>
        </section>

        <section id="ramais">
          <h2 className="titulo rev">📞 Lista de Ramais</h2>
          <input
            className="busca rev"
            type="search"
            aria-label="Buscar ramal ou setor"
            placeholder="Buscar ramal ou setor..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="ramais" id="lista" aria-live="polite">
            {filteredExtensions.map(([number, label]) => (
              <div className="ramal rev" key={number}>
                <b>{number}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="principal pill rev">
            Número Principal <strong>(54) 3698-0231</strong>
          </div>
        </section>

        <section id="chamado">
          <h2 className="titulo rev">🧰 Abra seu Chamado</h2>
          <div className="chamado">
            <div className="painel rev">
              <h3>Abra seu Chamado</h3>
              <p>
                Aponte a câmera do seu celular para o QR Code e acesse{" "}
                <strong>o sistema de chamados</strong>.
              </p>
              <div className="qr">
                <QRCodeSVG
                  value={ticketUrl}
                  level="M"
                  title="QR Code do sistema de chamados"
                />
              </div>
              <a
                className="link"
                href={ticketUrl}
                target="_blank"
                rel="noreferrer"
              >
                https://upacentral.netlify.app/
              </a>
            </div>
            <div className="painel suporte rev">
              <h4>SUPORTE / CONTATO</h4>
              <p>
                Em caso de dúvidas ou dificuldades, entre em contato pelo ramal
                ou pelo número principal.
              </p>
              <p>
                Ramal da TI:{" "}
                <strong className="ramal-ti">229 – Sala TI</strong>
              </p>
              <p className="tel">(54) 3698-0231</p>
              <p>
                <span className="badge24">
                  <span className="dot" /> ATENDIMENTO 24H
                </span>
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <button className="logout-button" type="button" onClick={onSignOut}>
          Sair do sistema
        </button>
        <div>© Fluxo TI · UPA Central 24H – FUCS</div>
      </footer>
    </>
  );
}

function LegacyApp({ app, session }) {
  const src = `${baseUrl}legacy/${encodeURIComponent(app.file)}`;
  const [loadError, setLoadError] = React.useState("");
  const [syncError, setSyncError] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLoaded(false);
    setLoadError("");
    setSyncError("");

    loadSystemState(app.id, session.user.id)
      .then(() => {
        if (active) setLoaded(true);
      })
      .catch((error) => {
        if (active) {
          setLoadError(error.message || "Não foi possível carregar os dados.");
        }
      });

    return () => {
      active = false;
    };
  }, [app.id, session.user.id]);

  React.useEffect(() => {
    if (!loaded) return undefined;

    const prefix = getSystemStoragePrefix(app.id);
    let timeout;
    let saveQueue = Promise.resolve();
    let active = true;

    const onStorage = (event) => {
      if (!event.key?.startsWith(prefix)) return;

      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        saveQueue = saveQueue
          .then(() => saveLoadedSystemState(app.id, session.user.id))
          .then(() => {
            if (active) setSyncError("");
          })
          .catch((error) => {
            if (active) {
              setSyncError(
                error.message || "Não foi possível sincronizar os dados.",
              );
            }
          });
      }, 700);
    };

    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      window.removeEventListener("storage", onStorage);
    };
  }, [app.id, loaded, session.user.id]);

  if (loadError) {
    return (
      <main className="not-found" role="alert">
        <h1>Falha ao carregar os dados</h1>
        <p>{loadError}</p>
        <Link to="/">Voltar ao portal</Link>
      </main>
    );
  }

  if (!loaded) {
    return (
      <main className="not-found" role="status">
        <p>Carregando os dados do Supabase...</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <iframe className="legacy-frame" title={app.title} src={src} />
      {syncError && (
        <div className="sync-error" role="alert">
          Não foi possível sincronizar: {syncError}
        </div>
      )}
    </main>
  );
}

function NotFound() {
  return (
    <main className="not-found">
      <h1>Página não encontrada</h1>
      <Link to="/">Voltar ao início</Link>
    </main>
  );
}

function LoginPage({ onLogin, error, loading }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  function submit(event) {
    event.preventDefault();
    onLogin(email, password);
  }

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <img
          src={`${baseUrl}assets/fucs-logo.jpg`}
          alt="Logo FUCS - Fundação Universidade de Caxias do Sul"
        />
        <h1>Fluxo UPA Central</h1>
        <p>Entre para acessar os sistemas e os dados dos pacientes.</p>
        <label>
          E-mail
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

function SupabaseSetup() {
  return (
    <main className="login-shell">
      <section className="login-card" role="alert">
        <h1>Configuração necessária</h1>
        <p>
          Configure a URL e a chave pública do Supabase no arquivo
          {" "}<code>.env.local</code>, aplique o SQL de
          {" "}<code>supabase/schema.sql</code> e reinicie o projeto.
        </p>
        <p>
          Use somente a chave pública anon/publishable. Nunca coloque uma chave
          service_role neste aplicativo.
        </p>
      </section>
    </main>
  );
}

function App() {
  const location = useLocation();
  const [session, setSession] = React.useState(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const [loginLoading, setLoginLoading] = React.useState(false);
  const [authError, setAuthError] = React.useState("");

  React.useEffect(() => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0 });
    }
  }, [location.pathname]);

  React.useEffect(() => {
    if (!supabaseConfigured || !supabase) return undefined;

    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (active) {
        if (event === "SIGNED_OUT") clearSystemStorageCache();
        setSession(nextSession);
        setAuthError("");
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(error.message);
        setSession(data.session);
        setAuthLoading(false);
      })
      .catch((error) => {
        if (active) {
          setAuthError(error.message || "Não foi possível validar o login.");
          setAuthLoading(false);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email, password) {
    setLoginLoading(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setAuthError(error.message);
    } catch (error) {
      setAuthError(error.message || "Não foi possível entrar.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError(error.message);
      } else {
        clearSystemStorageCache();
      }
    } catch (error) {
      setAuthError(error.message || "Não foi possível sair do sistema.");
    }
  }

  if (!supabaseConfigured) return <SupabaseSetup />;
  if (authLoading) {
    return (
      <main className="not-found" role="status">
        <p>Verificando acesso...</p>
      </main>
    );
  }
  if (!session) {
    return (
      <LoginPage
        onLogin={signIn}
        error={authError}
        loading={loginLoading}
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage onSignOut={signOut} />} />
      {Object.entries(legacyApps).map(([id, app]) => (
        <Route
          key={id}
          path={`/apps/${id}`}
          element={<LegacyApp key={id} app={app} session={session} />}
        />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
