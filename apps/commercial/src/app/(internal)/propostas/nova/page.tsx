import { createProposalAction } from "../actions";

export default function NewProposalPage() {
  return (
    <section>
      <header>
        <p>Novo rascunho</p>
        <h2>Criar proposta</h2>
      </header>
      <form action={createProposalAction}>
        <label>
          Titulo da proposta
          <input name="title" required />
        </label>
        <label>
          Cliente
          <input name="customerName" required />
        </label>
        <label>
          Email do cliente
          <input name="customerEmail" type="email" />
        </label>
        <button type="submit">Criar proposta</button>
      </form>
    </section>
  );
}
