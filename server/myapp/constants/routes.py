class RouteStore:
    def __init__(self):
        self.routes = []

    def add_route(self, rule, methods, description=None):
        self.routes.append({
            'rule': rule,
            'methods': methods,
            'description': description
        })

route_store = RouteStore()

route_store.add_route('/admin', ['GET', 'POST'], 'Admin page')
