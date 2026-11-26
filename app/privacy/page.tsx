import Link from "next/link";
import { LEGAL, LegalPage } from "@/components/legal";

export const metadata = { title: "Privacy Policy · Flowvault" };

export default function Privacy() {
  const { company, rc, address, email } = LEGAL;
  return (
    <LegalPage title="Privacy">
      <p>This policy explains what personal data {company} ({rc}), {address}, collects when you use Flowvault, why, and your rights. We follow the Nigeria Data Protection Act 2023 (NDPA) and the Nigeria Data Protection Regulation (NDPR). We are the data controller for Flowvault.</p>

      <h3>1. What we collect</h3>
      <ul>
        <li><b>Account details:</b> your name, email, phone number and password (stored securely, never readable by us).</li>
        <li><b>ID check:</b> your BVN, NIN, date of birth, address, a photo of your ID and a selfie. We pass these to our card partner Maplerad to confirm who you are. <b>Flowvault does not keep your ID photo or selfie</b>, and does not store your BVN or NIN in its own database; we keep only the result of the check and your Maplerad customer reference.</li>
        <li><b>Money:</b> your wallet balance, top-ups, fees, subscriptions you add, card status and card payments.</li>
        <li><b>Card details:</b> card numbers and CVVs are held by Maplerad. We show them to you when you ask and store only the last four digits.</li>
        <li><b>Payments in:</b> Paystack processes your bank transfers and debit cards. We receive the amount, reference and result, not your full bank card number.</li>
        <li><b>Technical data:</b> login cookies, and basic logs (such as IP address and device) that keep the service secure.</li>
      </ul>

      <h3>2. Why we use it, and our legal basis</h3>
      <ul>
        <li>To open and run your account, make cards and process payments (to perform our contract with you).</li>
        <li>To check your identity and prevent fraud and money laundering (legal obligation).</li>
        <li>To keep Flowvault secure, fix problems and improve it (legitimate interests).</li>
        <li>To send you service messages, for example about payments, fees or changes to our terms. We will only send marketing if you agree, and you can stop it any time.</li>
      </ul>

      <h3>3. Who we share it with</h3>
      <ul>
        <li><b>Maplerad</b> (card issuing and identity checks) and its partner banks and card networks.</li>
        <li><b>Paystack</b> (payments into your wallet).</li>
        <li><b>Supabase</b> (our database and login) and <b>Render</b> (where the app runs).</li>
        <li>Regulators, law enforcement or courts when the law requires it.</li>
      </ul>
      <p>We do not sell your personal data. Some of these providers store data outside Nigeria; where they do, we rely on the safeguards the NDPA allows, such as contracts that protect your data.</p>

      <h3>4. How long we keep it</h3>
      <p>We keep account and transaction records for as long as your account is open and then for the period the law requires for financial records (generally at least 5 years after it closes). After that we delete or anonymise them.</p>

      <h3>5. Keeping it safe</h3>
      <p>Data is encrypted in transit, access is limited to people who need it, secret keys stay on our servers, and card details are held by our card partner. No system is perfectly secure; if a breach affects you we will tell you and the Nigeria Data Protection Commission as the law requires.</p>

      <h3>6. Your rights</h3>
      <p>You can ask to see your data, correct it, delete it (where we don&apos;t have to keep it by law), restrict or object to how we use it, get a copy to take elsewhere, and withdraw consent you gave. Email {email}. We reply within 30 days. You can also complain to the Nigeria Data Protection Commission (ndpc.gov.ng).</p>

      <h3>7. Children</h3>
      <p>Flowvault is for people aged 18 and over. We don&apos;t knowingly collect data from children.</p>

      <h3>8. Cookies</h3>
      <p>We use only the cookies needed to keep you signed in and secure. We don&apos;t use advertising cookies.</p>

      <h3>9. Changes</h3>
      <p>We may update this policy and will tell you in the app or by email about important changes.</p>

      <h3>10. Contact</h3>
      <p>{company}, {address}. Email: {email}.</p>
      <p>See also our <Link href="/terms">Terms and Conditions</Link>.</p>
    </LegalPage>
  );
}
