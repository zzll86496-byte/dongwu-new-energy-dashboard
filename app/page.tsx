import "./portal-home.css";

const databases = [
  { href: "/database", title: "储能电池产业链数据库" },
  { href: "/lithium", title: "锂电产业链排产数据库" },
  { href: "/battery-export", title: "国内电池出口数据库" },
  { href: "/vehicle-supply", title: "动力电池车企配套数据库" },
  { href: "/installation", title: "电动车装机数据库" },
  { href: "/sales", title: "国内电动车销量数据库" },
];

export default function Home() {
  return (
    <main className="database-portal">
      <a className="database-portal__skip-link" href="#database-list">
        跳到数据库入口
      </a>

      <header className="database-portal__header">
        <a className="database-portal__brand" href="/" aria-label="东吴证券首页">
          <img
            src="/soochow-securities.png"
            width="218"
            height="48"
            alt="东吴证券 Soochow Securities"
          />
        </a>
      </header>

      <section className="database-portal__content" aria-labelledby="page-title">
        <div className="database-portal__intro">
          <h1 id="page-title">新能源产业链数据库</h1>
          <p>选择数据库进入查询</p>
          <div className="database-portal__update" role="status">
            <i aria-hidden="true" />
            <span>最新数据：电动车销量已覆盖至2026年7月</span>
          </div>
        </div>

        <nav className="database-portal__grid" id="database-list" aria-label="数据库入口">
          {databases.map((database) => (
            <a className="database-portal__card" href={database.href} key={database.href}>
              <span>{database.title}</span>
            </a>
          ))}
        </nav>
      </section>
    </main>
  );
}
