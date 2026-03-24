import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View
} from "@react-pdf/renderer";
import type { ProposalPresentationViewModel } from "@/lib/proposals/proposal-editor.types";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 11,
    color: "#1f2937"
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 20,
    marginBottom: 6
  },
  section: {
    marginBottom: 18
  },
  item: {
    borderTopWidth: 1,
    borderTopColor: "#d8d2c7",
    paddingTop: 10,
    marginTop: 10
  },
  image: {
    width: 180,
    height: 110,
    objectFit: "cover",
    marginBottom: 8
  },
  muted: {
    color: "#6b7280"
  }
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

type ProposalDocumentProps = {
  proposal: ProposalPresentationViewModel;
};

export function ProposalDocument({ proposal }: ProposalDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text>{proposal.number}</Text>
          <Text>{proposal.versionLabel}</Text>
          <Text style={styles.title}>{proposal.title}</Text>
          <Text>Cliente: {proposal.customerName}</Text>
          <Text style={styles.muted}>{proposal.intro}</Text>
          <Text>Total: {formatCurrency(proposal.totalPrice)}</Text>
        </View>
        {proposal.sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text>{section.title}</Text>
            <Text style={styles.muted}>
              Subtotal: {formatCurrency(section.totalPrice)}
            </Text>
            {section.items.map((item) => (
              <View key={item.id} style={styles.item}>
                {item.imageUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image src={item.imageUrl} style={styles.image} />
                ) : null}
                <Text>{item.typeLabel}</Text>
                <Text>{item.name}</Text>
                {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
                <Text>
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </Text>
                <Text>Total do item: {formatCurrency(item.totalPrice)}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
