import { ReactNode } from "react";

type Section = { heading: string; body: ReactNode };

const TermsSections: Section[] = [
  {
    heading: "Overview",
    body: (
      <>
        <p>
          This website is operated by DROP DEAD. Throughout the site, the terms "we", "us" and
          "our" refer to DROP DEAD. DROP DEAD offers this website, including all information, tools
          and Services available from this site to you, the user, conditioned upon your acceptance
          of all terms, conditions, policies and notices stated here.
        </p>
        <p>
          By visiting our site and/or purchasing something from us, you engage in our "Service" and
          agree to be bound by the following terms and conditions ("Terms of Service", "Terms"),
          including those additional terms and conditions and policies referenced herein and/or
          available by hyperlink. These Terms of Service apply to all users of the site, including
          without limitation users who are browsers, vendors, customers, merchants, and/or
          contributors of content.
        </p>
        <p>
          Please read these Terms of Service carefully before accessing or using our website. By
          accessing or using any part of the site, you agree to be bound by these Terms of Service.
          If you do not agree to all the terms and conditions of this agreement, then you may not
          access the website or use any Services.
        </p>
        <p>
          Any new features or tools which are added to the current store shall also be subject to
          the Terms of Service. You can review the most current version of the Terms of Service at
          any time on this page. We reserve the right to update, change or replace any part of
          these Terms of Service by posting updates and/or changes to our website.
        </p>
        <p>
          Our store is hosted on Shopify Inc. They provide us with the online e-commerce platform
          that allows us to sell our products and Services to you.
        </p>
      </>
    ),
  },
  {
    heading: "Section 1 - Online Store Terms",
    body: (
      <>
        <p>
          By agreeing to these Terms of Service, you represent that you are at least the age of
          majority in your state or province of residence, or that you are the age of majority in
          your state or province of residence and you have given us your consent to allow any of
          your minor dependents to use this site.
        </p>
        <p>
          You may not use our products for any illegal or unauthorized purpose nor may you, in the
          use of the Service, violate any laws in your jurisdiction (including but not limited to
          copyright laws).
        </p>
        <p>You must not transmit any worms or viruses or any code of a destructive nature.</p>
        <p>
          A breach or violation of any of the Terms will result in an immediate termination of your
          Services.
        </p>
      </>
    ),
  },
  {
    heading: "Section 2 - General Conditions",
    body: (
      <>
        <p>We reserve the right to refuse Service to anyone for any reason at any time.</p>
        <p>
          You understand that your content (not including credit card information), may be
          transferred unencrypted and involve (a) transmissions over various networks; and (b)
          changes to conform and adapt to technical requirements of connecting networks or devices.
          Credit card information is always encrypted during transfer over networks.
        </p>
        <p>
          You agree not to reproduce, duplicate, copy, sell, resell or exploit any portion of the
          Service, use of the Service, or access to the Service or any contact on the website
          through which the Service is provided, without express written permission by us.
        </p>
      </>
    ),
  },
  {
    heading: "Section 3 - Accuracy, Completeness and Timeliness of Information",
    body: (
      <p>
        We are not responsible if information made available on this site is not accurate, complete
        or current. The material on this site is provided for general information only and should
        not be relied upon or used as the sole basis for making decisions without consulting
        primary, more accurate, more complete or more timely sources of information. Any reliance
        on the material on this site is at your own risk.
      </p>
    ),
  },
  {
    heading: "Section 4 - Modifications to the Service and Prices",
    body: (
      <>
        <p>Prices for our products are subject to change without notice.</p>
        <p>
          We reserve the right at any time to modify or discontinue the Service (or any part or
          content thereof) without notice at any time.
        </p>
        <p>
          We shall not be liable to you or to any third-party for any modification, price change,
          suspension or discontinuance of the Service.
        </p>
      </>
    ),
  },
  {
    heading: "Section 5 - Products or Services",
    body: (
      <>
        <p>
          Certain products or Services may be available exclusively online through the website.
          These products or Services may have limited quantities and are subject to return or
          exchange only according to our Refund Policy.
        </p>
        <p>
          We have made every effort to display as accurately as possible the colors and images of
          our products. We cannot guarantee that your computer monitor's display of any color will
          be accurate.
        </p>
        <p>
          We reserve the right, but are not obligated, to limit the sales of our products or
          Services to any person, geographic region or jurisdiction. We reserve the right to limit
          the quantities of any products or Services that we offer.
        </p>
      </>
    ),
  },
  {
    heading: "Section 6 - Accuracy of Billing and Account Information",
    body: (
      <>
        <p>
          We reserve the right to refuse any order you place with us. We may, in our sole
          discretion, limit or cancel quantities purchased per person, per household or per order.
          We reserve the right to limit or prohibit orders that, in our sole judgment, appear to be
          placed by dealers, resellers or distributors.
        </p>
        <p>
          You agree to provide current, complete and accurate purchase and account information for
          all purchases made at our store. You agree to promptly update your account and other
          information so that we can complete your transactions and contact you as needed.
        </p>
      </>
    ),
  },
  {
    heading: "Section 7 - Optional Tools",
    body: (
      <p>
        We may provide you with access to third-party tools over which we neither monitor nor have
        any control nor input. You acknowledge and agree that we provide access to such tools "as
        is" and "as available" without any warranties, representations or conditions of any kind
        and without any endorsement.
      </p>
    ),
  },
  {
    heading: "Section 8 - Third-Party Links",
    body: (
      <p>
        Third-party links on this site may direct you to third-party websites that are not
        affiliated with us. We are not responsible for examining or evaluating the content or
        accuracy and we do not warrant and will not have any liability or responsibility for any
        third-party materials or websites, or for any other materials, products, or Services of
        third-parties.
      </p>
    ),
  },
  {
    heading: "Section 9 - User Comments, Feedback and Other Submissions",
    body: (
      <p>
        If you send creative ideas, suggestions, proposals, plans, or other materials, you agree
        that we may, at any time, without restriction, edit, copy, publish, distribute, translate
        and otherwise use in any medium any comments that you forward to us. We are and shall be
        under no obligation to maintain any comments in confidence, to pay compensation for any
        comments, or to respond to any comments.
      </p>
    ),
  },
  {
    heading: "Section 10 - Personal Information",
    body: (
      <p>
        Your submission of personal information through the store is governed by our Privacy
        Policy. You also agree to our Messaging Terms and Messaging Privacy Policy.
      </p>
    ),
  },
  {
    heading: "Section 11 - Errors, Inaccuracies and Omissions",
    body: (
      <p>
        Occasionally there may be information on our site or in the Service that contains
        typographical errors, inaccuracies or omissions that may relate to product descriptions,
        pricing, promotions, offers, product shipping charges, transit times and availability. We
        reserve the right to correct any errors, inaccuracies or omissions, and to change or update
        information or cancel orders if any information is inaccurate at any time without prior
        notice (including after you have submitted your order).
      </p>
    ),
  },
  {
    heading: "Section 12 - Prohibited Uses",
    body: (
      <p>
        In addition to other prohibitions as set forth in the Terms of Service, you are prohibited
        from using the site or its content: for any unlawful purpose; to solicit others to perform
        or participate in any unlawful acts; to violate any regulations, rules or laws; to infringe
        upon intellectual property rights; to harass or discriminate; to submit false or misleading
        information; to upload viruses or malicious code; to collect or track the personal
        information of others; to spam, phish, pharm, pretext, spider, crawl, or scrape; for any
        obscene or immoral purpose; or to interfere with or circumvent the security features of
        the Service.
      </p>
    ),
  },
  {
    heading: "Section 13 - Disclaimer of Warranties; Limitation of Liability",
    body: (
      <>
        <p>
          We do not guarantee, represent or warrant that your use of our Service will be
          uninterrupted, timely, secure or error-free. You expressly agree that your use of, or
          inability to use, the Service is at your sole risk. The Service and all products and
          Services delivered to you through the Service are (except as expressly stated by us)
          provided "as is" and "as available" for your use, without any representation, warranties
          or conditions of any kind.
        </p>
        <p>
          In no case shall DROP DEAD, our directors, officers, employees, affiliates, agents,
          contractors, interns, suppliers, Service providers or licensors be liable for any injury,
          loss, claim, or any direct, indirect, incidental, punitive, special, or consequential
          damages of any kind, including lost profits, lost revenue, lost savings, loss of data, or
          replacement costs.
        </p>
      </>
    ),
  },
  {
    heading: "Section 14 - Indemnification",
    body: (
      <p>
        You agree to indemnify, defend and hold harmless DROP DEAD and our parent, subsidiaries,
        affiliates, partners, officers, directors, agents, contractors, licensors, Service
        providers, subcontractors, suppliers, interns and employees, from any claim or demand,
        including reasonable attorneys' fees, made by any third-party due to or arising out of your
        breach of these Terms of Service or your violation of any law or the rights of a
        third-party.
      </p>
    ),
  },
  {
    heading: "Section 15 - Severability",
    body: (
      <p>
        In the event that any provision of these Terms of Service is determined to be unlawful,
        void or unenforceable, such provision shall nonetheless be enforceable to the fullest
        extent permitted by applicable law, and the unenforceable portion shall be deemed to be
        severed from these Terms of Service.
      </p>
    ),
  },
  {
    heading: "Section 16 - Termination",
    body: (
      <p>
        These Terms of Service are effective unless and until terminated by either you or us. You
        may terminate these Terms of Service at any time by notifying us that you no longer wish to
        use our Services, or when you cease using our site. If in our sole judgment you fail to
        comply with any term or provision of these Terms of Service, we also may terminate this
        agreement at any time without notice.
      </p>
    ),
  },
  {
    heading: "Section 17 - Entire Agreement",
    body: (
      <p>
        These Terms of Service and any policies or operating rules posted by us on this site or in
        respect to the Service constitute the entire agreement and understanding between you and us
        and govern your use of the Service, superseding any prior or contemporaneous agreements.
      </p>
    ),
  },
  {
    heading: "Section 18 - Governing Law",
    body: (
      <p>
        These Terms of Service and any separate agreements whereby we provide you Services shall be
        governed by and construed in accordance with the laws of the United States.
      </p>
    ),
  },
  {
    heading: "Section 19 - Changes to Terms of Service",
    body: (
      <p>
        We reserve the right, at our sole discretion, to update, change or replace any part of
        these Terms of Service by posting updates and changes to our website. Your continued use of
        or access to our website or the Service following the posting of any changes constitutes
        acceptance of those changes.
      </p>
    ),
  },
  {
    heading: "Section 20 - Contact Information",
    body: (
      <>
        <p>DROP DEAD LLC</p>
        <p>hello@dropdeadextensions.com</p>
        <p>910 W Carver Rd. Suite D8, Tempe, AZ 85284</p>
      </>
    ),
  },
];

const PrivacySections: Section[] = [
  {
    heading: "Overview",
    body: (
      <>
        <p>
          DROP DEAD operates this store and website, including all related information, content,
          features, tools, products and services, in order to provide you, the customer, with a
          curated shopping experience (the "Services"). DROP DEAD is powered by Shopify, which
          enables us to provide the Services to you.
        </p>
        <p>
          This Privacy Policy describes how we collect, use, and disclose your personal information
          when you visit, use, or make a purchase or other transaction using the Services or
          otherwise communicate with us. If there is a conflict between our Terms of Service and
          this Privacy Policy, this Privacy Policy controls with respect to the collection,
          processing, and disclosure of your personal information.
        </p>
      </>
    ),
  },
  {
    heading: "Personal Information We Collect or Process",
    body: (
      <>
        <p>
          We may collect or process the following categories of personal information, including
          inferences drawn from this personal information, depending on how you interact with the
          Services, where you live, and as permitted or required by applicable law:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Contact details</strong> including your name, address, billing address,
            shipping address, phone number, and email address.
          </li>
          <li>
            <strong>Financial information</strong> including credit card, debit card, and financial
            account numbers, payment card information, transaction details, and payment
            confirmation.
          </li>
          <li>
            <strong>Account information</strong> including your username, password, security
            questions, preferences and settings.
          </li>
          <li>
            <strong>Transaction information</strong> including the items you view, put in your
            cart, add to your wishlist, or purchase, return, exchange or cancel.
          </li>
          <li>
            <strong>Communications with us</strong> including the information you include when
            sending a customer support inquiry.
          </li>
          <li>
            <strong>Device information</strong> including information about your device, browser,
            or network connection, your IP address, and other unique identifiers.
          </li>
          <li>
            <strong>Usage information</strong> including how and when you interact with or navigate
            the Services.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "Personal Information Sources",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Directly from you</strong> when you create an account, visit or use the Services,
          communicate with us, or otherwise provide us with your personal information.
        </li>
        <li>
          <strong>Automatically through the Services</strong> including from your device and
          through the use of cookies and similar technologies.
        </li>
        <li>
          <strong>From our service providers</strong> when they collect or process your personal
          information on our behalf.
        </li>
        <li>From our partners or other third parties.</li>
      </ul>
    ),
  },
  {
    heading: "How We Use Your Personal Information",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Provide, tailor, and improve the Services,</strong> including performing our
          contract with you, processing payments, fulfilling orders, managing your account,
          arranging shipping, facilitating returns and exchanges, and recommending products.
        </li>
        <li>
          <strong>Marketing and advertising,</strong> such as sending marketing, advertising and
          promotional communications by email, text message or postal mail, and showing you online
          advertisements based on your prior activity.
        </li>
        <li>
          <strong>Security and fraud prevention,</strong> to authenticate your account, provide a
          secure payment experience, and detect or investigate possible fraudulent, illegal, or
          malicious activity.
        </li>
        <li>
          <strong>Communicating with you,</strong> to provide customer support and maintain our
          business relationship.
        </li>
        <li>
          <strong>Legal reasons,</strong> to comply with applicable law or respond to valid legal
          process and to enforce or investigate potential violations of our terms or policies.
        </li>
      </ul>
    ),
  },
  {
    heading: "How We Disclose Personal Information",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          With Shopify, vendors and other third parties who perform services on our behalf (e.g.
          IT management, payment processing, data analytics, customer support, cloud storage,
          fulfillment and shipping).
        </li>
        <li>
          With business and marketing partners to provide marketing services and advertise to you.
        </li>
        <li>
          When you direct, request us or otherwise consent to our disclosure of certain
          information to third parties.
        </li>
        <li>With our affiliates or otherwise within our corporate group.</li>
        <li>
          In connection with a business transaction such as a merger or bankruptcy, to comply with
          any applicable legal obligations, and to protect or defend the Services, our rights, and
          the rights of our users or others.
        </li>
      </ul>
    ),
  },
  {
    heading: "Relationship with Shopify",
    body: (
      <p>
        The Services are hosted by Shopify, which collects and processes personal information
        about your access to and use of the Services in order to provide and improve the Services
        for you. Information you submit to the Services will be transmitted to and shared with
        Shopify as well as third parties that may be located in countries other than where you
        reside. To learn more about how Shopify uses your personal information and any rights you
        may have, visit the Shopify Consumer Privacy Policy.
      </p>
    ),
  },
  {
    heading: "Third Party Websites and Links",
    body: (
      <p>
        The Services may provide links to websites or other online platforms operated by third
        parties. If you follow links to sites not affiliated or controlled by us, you should review
        their privacy and security policies. We do not guarantee and are not responsible for the
        privacy or security of such sites.
      </p>
    ),
  },
  {
    heading: "Children's Data",
    body: (
      <p>
        The Services are not intended to be used by children, and we do not knowingly collect any
        personal information about children under the age of majority in your jurisdiction. As of
        the effective date of this Privacy Policy, we do not have actual knowledge that we "share"
        or "sell" personal information of individuals under 16 years of age.
      </p>
    ),
  },
  {
    heading: "Security and Retention of Your Information",
    body: (
      <>
        <p>
          Please be aware that no security measures are perfect or impenetrable, and we cannot
          guarantee "perfect security." Any information you send to us may not be secure while in
          transit. We recommend that you do not use unsecure channels to communicate sensitive or
          confidential information to us.
        </p>
        <p>
          How long we retain your personal information depends on different factors, such as
          whether we need the information to maintain your account, provide you with Services,
          comply with legal obligations, resolve disputes or enforce other applicable contracts and
          policies.
        </p>
      </>
    ),
  },
  {
    heading: "Your Rights and Choices",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Right to access / know</strong> what personal information we hold about you.
        </li>
        <li>
          <strong>Right to delete</strong> personal information we maintain about you.
        </li>
        <li>
          <strong>Right to correct</strong> inaccurate personal information we maintain about you.
        </li>
        <li>
          <strong>Right of portability</strong> to receive a copy of your personal information and
          to request that we transfer it to a third party.
        </li>
        <li>
          <strong>Right to opt out of sale or sharing for targeted advertising,</strong> as defined
          in applicable privacy laws. We honor the Global Privacy Control signal.
        </li>
        <li>
          <strong>Managing communication preferences,</strong> including opting out of promotional
          emails using the unsubscribe option in our emails.
        </li>
      </ul>
    ),
  },
  {
    heading: "Complaints",
    body: (
      <p>
        If you have complaints about how we process your personal information, please contact us
        using the contact details below. Depending on where you live, you may have the right to
        appeal our decision or lodge a complaint with your local data protection authority.
      </p>
    ),
  },
  {
    heading: "International Transfers",
    body: (
      <p>
        We may transfer, store and process your personal information outside the country you live
        in. If we transfer your personal information out of the European Economic Area or the
        United Kingdom, we will rely on recognized transfer mechanisms like the European
        Commission's Standard Contractual Clauses, unless the transfer is to a country determined
        to provide an adequate level of protection.
      </p>
    ),
  },
  {
    heading: "Changes to This Privacy Policy",
    body: (
      <p>
        We may update this Privacy Policy from time to time, including to reflect changes to our
        practices or for other operational, legal, or regulatory reasons. We will post the revised
        Privacy Policy on this website, update the "Last updated" date and provide notice as
        required by applicable law.
      </p>
    ),
  },
  {
    heading: "Contact",
    body: (
      <p>
        Should you have any questions about our privacy practices or this Privacy Policy, or if
        you would like to exercise any of the rights available to you, please email us at
        hello@dropdeadextensions.com or contact us at 910 W. Carver Rd Suite D8, Tempe, AZ 85284,
        US. For the purpose of applicable data protection laws, we are the data controller of your
        personal information.
      </p>
    ),
  },
];

function renderSections(sections: Section[]) {
  return sections.map((section) => (
    <section key={section.heading} className="space-y-2">
      <h3 className="text-foreground font-medium">{section.heading}</h3>
      <div className="space-y-2">{section.body}</div>
    </section>
  ));
}

export const TermsOfServiceContent = () => (
  <div className="space-y-4 text-sm text-muted-foreground">
    <p className="text-foreground font-medium">
      Terms of Service · DROP DEAD LLC
    </p>
    {renderSections(TermsSections)}
  </div>
);

export const PrivacyPolicyContent = () => (
  <div className="space-y-4 text-sm text-muted-foreground">
    <p className="text-foreground font-medium">Last updated: February 27, 2026</p>
    {renderSections(PrivacySections)}
  </div>
);
