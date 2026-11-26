import Link from "next/link";
import { LEGAL, LegalPage } from "@/components/legal";

export const metadata = { title: "Privacy Policy · Flowvault" };

export default function Privacy() {
  const { company, rc, address, email } = LEGAL;
  const mail = <a href={`mailto:${email}`}>{email}</a>;
  return (
    <LegalPage title="Privacy">
      <p>This policy explains what personal data {company} ({rc}), {address}, collects when you use Flowvault, why, who we share it with and your rights. We follow the Nigeria Data Protection Act 2023 (NDPA) and the rules of the Nigeria Data Protection Commission (NDPC). We are the data controller for Flowvault.</p>
      <p><b>Data protection contact:</b> our Data Protection Officer can be reached at {mail} (please put &quot;Privacy&quot; in the subject).</p>

      <h3>1. What we collect</h3>
      <ul>
        <li><b>Account details:</b> your name, email, phone number and password (stored securely as a hash; we can&apos;t read it), and when you accepted our terms.</li>
        <li><b>ID check:</b> your BVN, NIN, date of birth, home address, a photo of your ID and a selfie. We pass these to our card partner Maplerad, which checks them against official records. <b>Flowvault does not keep your ID photo or selfie, and does not store your BVN or NIN in its own database.</b> We keep the result of the check and your Maplerad customer reference.</li>
        <li><b>Money:</b> your wallet balance, top-ups, fees, the subscriptions you add, card status and card payments.</li>
        <li><b>Card details:</b> full card numbers and CVVs are held by Maplerad. We show them to you when you ask, and store only the last four digits.</li>
        <li><b>Payments in:</b> Paystack processes your bank transfers and debit cards. We receive the amount, reference and result, not your full bank card number.</li>
        <li><b>Technical data:</b> login cookies and basic logs (such as IP address, device and browser) that keep the service secure.</li>
      </ul>

      <h3>2. Sensitive data</h3>
      <p>Your selfie is biometric data, which the NDPA treats as sensitive. We process it only to confirm your identity, only with your explicit consent (which you give at the ID check step), and we don&apos;t keep it. You can withdraw that consent, but without an ID check we can&apos;t provide Flowvault, as the law requires us to know who our customers are.</p>

      <h3>3. Why we use it, and our legal basis</h3>
      <ul>
        <li>To open and run your account, make cards and process payments: <i>performing our contract with you</i>.</li>
        <li>To check your identity, keep financial records and prevent fraud, money laundering and terrorism financing: <i>legal obligation</i>.</li>
        <li>To process your selfie: <i>your explicit consent</i>.</li>
        <li>To keep Flowvault secure, fix problems and improve it: <i>our legitimate interests</i>, balanced against your rights.</li>
        <li>To send service messages (payments, fees, changes to our terms): <i>contract</i>. We will only send marketing if you agree, and you can stop it at any time.</li>
      </ul>

      <h3>4. Automated checks</h3>
      <p>The ID check is largely automated by Maplerad and its data sources, and our systems automatically flag unusual activity. If an automated decision stops you using Flowvault, you can ask for a person to review it and explain it by emailing {mail}.</p>

      <h3>5. Who we share it with</h3>
      <ul>
        <li><b>Maplerad</b>, for card issuing and identity checks, and its partner banks and card networks (Visa, Mastercard).</li>
        <li><b>Paystack</b>, for payments into your wallet.</li>
        <li><b>Supabase</b> (our database and login) and <b>Render</b> (where the app runs).</li>
        <li>Regulators, law enforcement or courts when the law requires it.</li>
      </ul>
      <p>We do not sell your personal data. Each provider may only use it to provide its service to us.</p>

      <h3>6. Transfers outside Nigeria</h3>
      <p>Some of these providers store or process data outside Nigeria, including in the United States and the European Union. We only transfer data where the NDPA allows it, for example where the country has adequate protection, under contracts with data protection clauses, or where the transfer is needed to perform our contract with you (such as issuing a card through an international card network). You can ask us for details of these safeguards.</p>

      <h3>7. How long we keep it</h3>
      <p>We keep account and transaction records while your account is open and for at least 5 years after it closes, as Nigerian anti-money laundering law requires. Security logs are kept for up to 12 months. After that we delete or anonymise data, unless a legal claim or investigation requires us to keep it longer.</p>

      <h3>8. Keeping it safe</h3>
      <p>Data is encrypted in transit, access is limited to people who need it, secret keys stay on our servers, and full card details are held by our card partner. No system is perfectly secure. If a breach is likely to put your rights at risk, we will report it to the NDPC within 72 hours of becoming aware of it and tell you without undue delay.</p>

      <h3>9. Your rights</h3>
      <p>You can ask to: see a copy of your data; correct it; delete it (where we don&apos;t have to keep it by law); restrict or object to how we use it; get it in a portable format; withdraw consent; and not be subject to a purely automated decision (section 4). Email {mail}. We may need to confirm it&apos;s you. We reply within 30 days and don&apos;t charge for this. If you&apos;re not satisfied, you can complain to the Nigeria Data Protection Commission (ndpc.gov.ng).</p>

      <h3>10. Children</h3>
      <p>Flowvault is for people aged 18 and over. We don&apos;t knowingly collect data from children. If you think a child has signed up, tell us and we will delete their data.</p>

      <h3>11. Cookies</h3>
      <p>We use only the cookies needed to keep you signed in and secure. We don&apos;t use advertising or tracking cookies.</p>

      <h3>12. Changes</h3>
      <p>We may update this policy and will tell you in the app or by email about important changes before they apply.</p>

      <h3>13. Contact</h3>
      <p>{company}, {address}. Email: {mail}.</p>
      <p>See also our <Link href="/terms">Terms and Conditions</Link>.</p>
    </LegalPage>
  );
}
