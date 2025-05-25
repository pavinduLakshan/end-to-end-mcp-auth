# End-to-end MCP Authorization Demo

This repository demonstrates an end-to-end MCP authorization scenario.

Petvet is a vet clinic that provides online appointment booking facility. Customers can chat with its AI assistant to book an appointment. Once the booking is completed, customer is asked to pay for the booking via paypal. The agent uses paypal MCP server to construct the payment URL. Customer navigates to the URL and pays the amount. Upon redirection, Petvet AI assistant captures the payment information and updates its database.

# Architecture