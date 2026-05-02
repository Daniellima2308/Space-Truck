const { danger, markdown, warn } = require("danger");

const pr = danger.github.pr;
const body = pr.body || "";
const normalizedBody = body.toLowerCase();
const changedFiles = [
  ...danger.git.created_files,
  ...danger.git.modified_files,
  ...danger.git.deleted_files,
];

const uniqueFiles = Array.from(new Set(changedFiles));
const additions = pr.additions || 0;
const deletions = pr.deletions || 0;
const totalChanges = additions + deletions;

const matchesAny = (patterns) =>
  uniqueFiles.some((file) => patterns.some((pattern) => pattern.test(file)));

const bodyMentionsAny = (terms) =>
  terms.some((term) => normalizedBody.includes(term));

const changedCode = matchesAny([/^src\/.*\.(ts|tsx)$/]);
const changedUi = matchesAny([
  /^src\/components\//,
  /^src\/pages\//,
  /^src\/features\//,
  /\.stories\.(ts|tsx)$/,
]);
const changedSupabaseOrAuth = matchesAny([
  /^supabase\//,
  /^src\/integrations\/supabase\//,
  /^src\/context\/AuthContext\.tsx$/,
  /^src\/context\/auth-context\.ts$/,
]);
const changedWorkflows = matchesAny([/^\.github\/workflows\//]);
const changedPackageJson = uniqueFiles.includes("package.json");
const changedPackageLock = uniqueFiles.includes("package-lock.json");
const changedOnlyDocsOrGithubText = uniqueFiles.length > 0 && uniqueFiles.every((file) =>
  file.startsWith("docs/") ||
  file.startsWith(".github/ISSUE_TEMPLATE/") ||
  file === ".github/pull_request_template.md" ||
  file === "README.md" ||
  file === "AGENTS.md" ||
  file === "GEMINI.md" ||
  file.endsWith(".md")
);

const hasSection = (sectionTitle) =>
  new RegExp(`(^|\\n)##\\s+${sectionTitle}`, "i").test(body);

if (uniqueFiles.length > 15 || totalChanges > 700) {
  warn(
    `PR grande detectada: ${uniqueFiles.length} arquivos e ${totalChanges} linhas alteradas. ` +
      "Considere dividir em PRs menores se houver mais de uma intenção misturada."
  );
}

if (!hasSection("Objetivo")) {
  warn("O template de PR parece estar sem a seção `Objetivo`. Explique o problema real que esta mudança resolve.");
}

if (!hasSection("Validação")) {
  warn("O template de PR parece estar sem a seção `Validação`. Informe como a mudança foi conferida.");
}

if (!hasSection("Riscos e observações")) {
  warn("O template de PR parece estar sem a seção `Riscos e observações`. Registre riscos, limites ou decisões conscientes.");
}

if (changedWorkflows && !bodyMentionsAny(["permiss", "permission", "pinned", "pinada", "sha", "security", "seguran"])) {
  warn(
    "Esta PR altera GitHub Actions/workflows. Descreva permissões, Actions pinadas por SHA e impacto de segurança no corpo da PR."
  );
}

if (changedSupabaseOrAuth && !bodyMentionsAny(["supabase", "auth", "rls", "seguran", "security", "offline", "migra", "migration"])) {
  warn(
    "Esta PR toca Supabase/Auth/dados sensíveis. Explique impacto em RLS, segurança, migrações, login ou sincronização offline."
  );
}

if (changedUi && !bodyMentionsAny(["preview", "print", "screenshot", "storybook", "chromatic", "dark", "visual", "ui", "ux"])) {
  warn(
    "Esta PR altera UI/UX. Inclua preview, print, Storybook/Chromatic ou observação sobre leitura rápida/dark mode."
  );
}

if (changedCode && !changedOnlyDocsOrGithubText && !bodyMentionsAny(["npm run", "teste", "test", "build", "lint", "coverage", "valid"])) {
  warn(
    "Esta PR altera código em `src/`, mas a validação não ficou clara no corpo da PR. Informe lint, build, testes ou verificação manual."
  );
}

if (changedPackageJson && !changedPackageLock) {
  warn("`package.json` mudou sem `package-lock.json`. Confirme se isso é intencional ou atualize o lockfile.");
}

if (changedPackageLock && !changedPackageJson) {
  warn("`package-lock.json` mudou sem `package.json`. Confirme se a alteração de lockfile é intencional.");
}

markdown(`### Danger JS — conferência leve 🚛\n\n` +
  `- Arquivos alterados: **${uniqueFiles.length}**\n` +
  `- Linhas adicionadas/removidas: **+${additions} / -${deletions}**\n` +
  `- Modo atual: **warning-only**; este robô orienta, mas não bloqueia merge.\n\n` +
  `Use os avisos como checklist de carga antes de seguir viagem: se fizer sentido, corrija; se não fizer, explique a decisão na PR.`
);
