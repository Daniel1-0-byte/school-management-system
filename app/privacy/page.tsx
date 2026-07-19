export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        
        <div className="space-y-8 text-slate-300">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              SchoolHub (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;, or &quot;Company&quot;) operates the SchoolHub website. This page informs you of our policies 
              regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information Collection and Use</h2>
            <p className="mb-4">
              We collect several different types of information for various purposes to provide and improve our Service to you.
            </p>
            
            <h3 className="text-xl font-semibold text-white mb-3">Types of Data Collected:</h3>
            <ul className="space-y-3 text-slate-400">
              <li>
                <strong className="text-slate-300">Personal Data:</strong> While using our Service, we may ask you to provide us with certain personally 
                identifiable information that can be used to contact or identify you (&quot;Personal Data&quot;). This may include, but is not limited to:
                <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                  <li>Email address</li>
                  <li>First name and last name</li>
                  <li>Phone number</li>
                  <li>Address, State, Province, ZIP/Postal code, City</li>
                  <li>Cookies and Usage Data</li>
                </ul>
              </li>
              <li>
                <strong className="text-slate-300">Usage Data:</strong> We may also collect information on how the Service is accessed and used (&quot;Usage Data&quot;). 
                This may include information such as your computer&apos;s Internet Protocol address, browser type, browser version, the pages you visit, 
                the time and date of your visit, and other diagnostic data.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Use of Data</h2>
            <p className="mb-4">SchoolHub uses the collected data for various purposes:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400">
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
              <li>To provide customer care and support</li>
              <li>To gather analysis or valuable information so that we can improve our Service</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Security of Data</h2>
            <p>
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic 
              storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its 
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Service Providers</h2>
            <p>
              We may employ third party companies and individuals to facilitate our Service (&quot;Service Providers&quot;), to provide the Service on our 
              behalf, to perform Service-related services or to assist us in analyzing how our Service is used.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page 
              and updating the &quot;effective date&quot; at the top of this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us by email at support@schoolhub.com or by mail at:
            </p>
            <p className="mt-4 text-slate-400">
              SchoolHub<br />
              Support Team<br />
              Email: support@schoolhub.com
            </p>
          </section>

          <section className="pt-8 border-t border-slate-800">
            <p className="text-sm text-slate-500">
              Last updated: {new Date().getFullYear()}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
